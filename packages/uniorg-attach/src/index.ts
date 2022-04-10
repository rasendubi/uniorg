import path from 'path';
import { visitParents } from 'unist-util-visit-parents';

import type { Link, OrgData, PropertyDrawer, Section } from 'uniorg';
import type { Plugin } from 'unified';
import type { Node } from 'unist';
import type { VFile } from 'vfile';

export interface Options {
  /**
   * The directory where attachments are stored. If this is a relative
   * path, it will be interpreted relative to the directory where the
   * Org file lives.
   *
   * Corresponds to `org-attach-id-dir` in Emacs.
   */
  idDir: string;

  /**
   * Attachment inheritance for the outline.
   *
   * Enabling inheritance for implies that attachment links will look
   * through all parent headings until it finds the linked attachment.
   *
   * Corresponds to `org-attach-use-inheritance` in Emacs.
   */
  // TODO: 'selective value is currently not supported.
  //
  // We can implement it by either allowing an array in
  // `useInheritance` or adding a new option that would correspond to
  // `org-use-property-inheritance` in Emacs.
  useInheritance: boolean;

  /**
   * A function parsing an ID string into a folder-path.
   *
   * Similar to `org-attach-id-to-path-function-list` in Emacs, but
   * only allows one function.
   *
   * This module exports `idUuidFolderFormat` and `idTsFolderFormat`
   * that re-implement two common behaviors for org-attach.
   */
  idToPath: (id: string) => string;
}

const defaultOptions: Options = {
  idDir: 'data/',
  // TODO: default value in Emacs is 'selective
  useInheritance: false,
  idToPath: idUuidFolderFormat,
};

/**
 * Translate an UUID ID into a folder-path. Default format for how Org
 * translates ID properties to a path for attachments. Useful if ID is
 * generated with UUID.
 *
 * Corresponds to `org-attach-id-uuid-folder-format` in Emacs.
 */
export function idUuidFolderFormat(id: string): string {
  return path.join(id.substring(0, 2), id.substring(2));
}
/**
 * Translate an ID based on a timestamp to a folder-path. Useful way
 * of translation if ID is generated based on ISO8601 timestamp.
 * Splits the attachment folder hierarchy into year-month, the rest.
 *
 * Corresponds to `org-attach-id-ts-folder-format` in Emacs.
 */
export function idTsFolderFormat(id: string): string {
  return path.join(id.substring(0, 6), id.substring(6));
}

export const uniorgAttach: Plugin<[Partial<Options>?]> = (
  options: Partial<Options> = {}
) => {
  const opts = { ...defaultOptions, ...options };
  return transformer;

  function transformer(tree: Node, file: VFile) {
    visitParents(tree, 'link', (link: Link, ancestors) => {
      if (link.linkType === 'attachment') {
        const path = resolveAttachmentPath(link, ancestors, file, opts);
        link.linkType = 'file';
        link.path = path;
        link.rawLink = link.linkType + ':' + link.path;
      }
    });
  }
};

export default uniorgAttach;

function resolveAttachmentPath(
  link: Link,
  ancestors: Node[],
  file: VFile,
  options: Options
): string {
  if (path.isAbsolute(link.path)) {
    // Link is already absolute. Ignore any attachment directory.
    return link.path;
  }

  const dir = getProperty(ancestors, 'DIR', options.useInheritance);
  if (dir) {
    return path.join(dir, link.path);
  }

  const id = getProperty(ancestors, 'ID', options.useInheritance);
  if (id) {
    const directory = options.idToPath(id);
    return path.join(options.idDir, directory, link.path);
  }

  return link.path;
}

function getProperty(
  ancestors: Node[],
  property: string,
  useInheritance: boolean
): string | null {
  ancestors = [...ancestors];
  do {
    let parent = ancestors.pop();
    while (parent && parent.type !== 'section' && parent.type !== 'org-data') {
      parent = ancestors.pop();
    }

    if (!parent) {
      return null;
    }

    const properties = (parent as Section | OrgData).children.find(
      (n) => n.type === 'property-drawer'
    ) as PropertyDrawer | undefined;
    const value = properties?.children.find((p) => p.key === property)?.value;
    if (value !== undefined) {
      return value;
    }
  } while (useInheritance);

  return null;
}
