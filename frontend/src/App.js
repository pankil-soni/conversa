import "./App.css";
import { useContext } from "react";
import { useColorMode } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";
import chatContext from "./context/chatContext";
import Navbar from "./components/Navbar/Navbar";

function App() {
  const { toggleColorMode } = useColorMode();
  const { isAuthenticated } = useContext(chatContext);

  return (
    <div className="App">
      <Navbar
        toggleColorMode={toggleColorMode}
        isAuthenticated={isAuthenticated}
      />
      <Outlet />
    </div>
  );
}

export default App;
