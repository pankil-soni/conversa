import { useEffect, useState, useContext, useCallback } from "react";
import {
  Box,
  Divider,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  Text,
  Button,
} from "@chakra-ui/react";
import { ArrowBackIcon, ChevronRightIcon, Search2Icon } from "@chakra-ui/icons";
import chatContext from "../../context/chatContext";
import { userApi, conversationApi } from "../../lib/api";
import { emitJoinChat } from "../../lib/socket";
import { scrollbarSx } from "../../lib/utils";

const NewChats = ({ setActiveTab }) => {
  const [allUsers, setAllUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const {
    user,
    myChatList,
    setMyChatList,
    setReceiver,
    setActiveChatId,
  } = useContext(chatContext);

  /* ─── fetch non-friends whenever chat list changes ───────────────────── */
  const fetchNonFriends = useCallback(async () => {
    try {
      const data = await userApi.getNonFriends();
      setAllUsers(data);
      setFiltered(data);
    } catch (err) {
      console.error("Failed to fetch non-friends:", err);
    }
  }, []);

  useEffect(() => {
    fetchNonFriends();
  }, [myChatList, fetchNonFriends]);

  /* ─── search ─────────────────────────────────────────────────────────── */
  const handleSearch = (e) => {
    const q = e.target.value.toLowerCase();
    if (!q) return setFiltered(allUsers);
    setFiltered(allUsers.filter((u) => u.name.toLowerCase().includes(q)));
  };

  /* ─── create new conversation ────────────────────────────────────────── */
  const handleNewChat = async (receiverId) => {
    try {
      const data = await conversationApi.create([user._id, receiverId]);
      setMyChatList((prev) => [data, ...prev]);
      setReceiver(data.members[0]);
      setActiveChatId(data._id);
      emitJoinChat(data._id);
      setActiveTab(0);
      setFiltered((prev) => prev.filter((u) => u._id !== receiverId));
    } catch (err) {
      console.error("Failed to create chat:", err);
    }
  };

  return (
    <Flex direction="column" flex={1} overflow="hidden">
      {/* Header */}
      <Flex justify="space-between" align="center" flexShrink={0} px={2} pt={1}>
        <Button onClick={() => setActiveTab(0)}>
          <ArrowBackIcon />
        </Button>
        <InputGroup w="auto">
          <InputLeftElement pointerEvents="none">
            <Search2Icon color="gray.300" />
          </InputLeftElement>
          <Input type="text" placeholder="Enter name" onChange={handleSearch} />
        </InputGroup>
      </Flex>

      <Divider my={2} />

      {/* User list */}
      <Box flex={1} overflowY="auto" sx={scrollbarSx}>
        {filtered
          .filter((u) => u._id !== user._id)
          .map((u) => (
            <Flex key={u._id} p={2}>
              <Button
                h="4em"
                w="100%"
                justifyContent="space-between"
                onClick={() => handleNewChat(u._id)}
              >
                <Flex align="center">
                  <img
                    src={u.profilePic}
                    alt="profile"
                    style={{ width: 40, height: 40, borderRadius: "50%" }}
                  />
                  <Box mx={3} textAlign="start">
                    <Text fontSize="lg" fontWeight="bold">
                      {u.name}
                    </Text>
                  </Box>
                </Flex>
                <ChevronRightIcon />
              </Button>
            </Flex>
          ))}

        {filtered.length === 0 && (
          <Text textAlign="center" color="gray.500" mt={4}>
            No Other Users Found
          </Text>
        )}
      </Box>
    </Flex>
  );
};

export default NewChats;
