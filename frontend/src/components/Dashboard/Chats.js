import { useState } from "react";
import { Tabs, TabPanel, TabPanels } from "@chakra-ui/react";
import MyChatList from "./MyChatList";
import NewChats from "./NewChats";

const Chats = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Tabs
      isFitted
      variant="enclosed"
      index={activeTab}
      colorScheme="purple"
      display="flex"
      flexDirection="column"
      h="100%"
      overflow="hidden"
    >
      <TabPanels flex={1} display="flex" flexDirection="column" overflow="hidden">
        <TabPanel
          py={1}
          px={2}
          display={activeTab === 0 ? "flex" : "none"}
          flexDirection="column"
          flex={1}
          overflow="hidden"
          borderRightWidth={{ base: 0, lg: "1px" }}
        >
          <MyChatList setActiveTab={setActiveTab} />
        </TabPanel>
        <TabPanel
          px={{ base: 0, lg: 2 }}
          display={activeTab === 1 ? "flex" : "none"}
          flexDirection="column"
          flex={1}
          overflow="hidden"
          borderRightWidth={{ base: 0, lg: "1px" }}
        >
          <NewChats setActiveTab={setActiveTab} />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
};

export default Chats;
