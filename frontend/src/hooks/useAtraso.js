import { useEffect, useState } from "react";
export function useAtraso(valor, milissegundos = 350) {
  const [atrasado, setAtrasado] = useState(valor);

  useEffect(() => {
    const espera = setTimeout(() => setAtrasado(valor), milissegundos);
    return () => clearTimeout(espera);
  }, [valor, milissegundos]);

  return atrasado;
}