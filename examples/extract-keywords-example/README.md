This is an example project to convert org files to HTML and extract keywords.

Given [example.org](./example.org):
```
#+TITLE: Post title
#+AUTHOR: Your Name

other org-mode
```

the following commands

```sh
npm install
npm start
```

will output

```
<p>other org-mode
</p>
{ title: 'Post title', author: 'Your Name' }
```
