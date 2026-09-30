import LoginPage from "./pages/LoginPage";

export default function App() {
  return <LoginPage onLogin={(dados) => console.log(dados)} />;
}