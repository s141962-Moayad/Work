export default function Loading() {
  return (
    <div className="container-x py-10" role="status" aria-label="جارٍ التحميل">
      <div className="skeleton mb-6 h-10 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton h-64" />)}
      </div>
    </div>
  );
}
