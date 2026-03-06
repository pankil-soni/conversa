import { useState } from "react";
import { Tabs, TabList, TabPanels, Tab, TabPanel } from "@chakra-ui/react";
import Login from "./Login";
import Signup from "./Signup";

const Auth = ({ tabIndex = 0 }) => {
  const [activeTab, setActiveTab] = useState(tabIndex);

  return (
    <Tabs
      isFitted
      variant="enclosed"
      index={activeTab}
      onChange={setActiveTab}
      colorScheme="purple"
    >
      <TabList mb="2em">
        <Tab>Login</Tab>
        <Tab>Sign Up</Tab>
      </TabList>
      <TabPanels>
        <TabPanel p={0}>
          <Login onSwitchTab={setActiveTab} />
        </TabPanel>
        <TabPanel p={0}>
          <Signup onSwitchTab={setActiveTab} />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
};

export default Auth;
