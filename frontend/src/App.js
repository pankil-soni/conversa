import "./App.css";
import { useColorMode } from "@chakra-ui/react";
import Navbar from "./components/Navbar/Navbar";
import { useContext } from "react";
import chatContext from "./context/chatContext";

function App() {
  const { toggleColorMode } = useColorMode();
  const context = useContext(chatContext);

  return (
    <div className="App">
      <Navbar toggleColorMode={toggleColorMode} context={context} />
    </div>
  );
}

export default App;
