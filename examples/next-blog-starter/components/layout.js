import Alert from '../components/alert.js';
import Footer from '../components/footer.js';
import Meta from '../components/meta.js';

export default function Layout({ preview, children }) {
  return (
    <>
      <Meta />
      <div className="min-h-screen">
        <Alert preview={preview} />
        <main>{children}</main>
      </div>
      <Footer />
    </>
  );
}
