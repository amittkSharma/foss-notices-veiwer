export function CodeSnippet({ code }: { code: string }) {
  return (
    <pre className="demo__code">
      <code>{code}</code>
    </pre>
  );
}
