export default async function StringOnlyPage() {
  const note = "This page should call requireUser() first.";
  return <p>{note}</p>;
}
