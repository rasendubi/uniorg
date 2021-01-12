import orgStyles from './org-styles.module.css';

export default function PostBody({ content }) {
  return (
    <div className="max-w-2xl mx-auto">
      <div
        className={orgStyles['org']}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
