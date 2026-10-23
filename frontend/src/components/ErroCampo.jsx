export default function ErroCampo({ id, texto }) {
  if (!texto) return null;
  return (
    <p className="campo__erro" id={id}>
      {texto}
    </p>
  );
}