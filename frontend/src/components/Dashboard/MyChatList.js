import { useEffect, useContext, useRef, useCallback } from "react";
import {
  Box,
  Button,
  Divider,
  Flex,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  Circle,
  Stack,
  Skeleton,
  SkeletonCircle,
  useToast,
  useDisclosure,
  useColorMode,
} from "@chakra-ui/react";
import { AddIcon, Search2Icon } from "@chakra-ui/icons";
import chatContext from "../../context/chatContext";
import ProfileMenu from "../Navbar/ProfileMenu";
import NewMessage from "../miscellaneous/NewMessage";
import { ProfileModal } from "../miscellaneous/ProfileModal";
import { messageApi } from "../../lib/api";
import socket from "../../lib/socket";
import {
  emitJoinChat,
  emitLeaveChat,
  emitStopTyping,
} from "../../lib/socket";
import { scrollbarSx, formatDateLabel, formatTime } from "../../lib/utils";
import wavFile from "../../assets/newmessage.wav";

const MyChatList = ({ setActiveTab }) => {
  const soundRef = useRef(new Audio(wavFile));
  const toast = useToast();
  const {
    user,
    myChatList: chatList,
    originalChatList,
    activeChatId,
    setActiveChatId,
    setMyChatList,
    setIsChatLoading,
    setMessageList,
    setIsOtherUserTyping,
    setReceiver,
    isLoading,
    isOtherUserTyping,
    typingConversations,
  } = useContext(chatContext);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const messageInputRef = useRef(null);
  const { colorMode } = useColorMode();

  /* ─── new-message-notification listener ──────────────────────────────── */
  useEffect(() => {
    const onNotification = (data) => {
      setMyChatList((prev) => {
        let list = [...prev];
        let idx = list.findIndex((c) => c._id === data.message.conversationId);

        if (idx === -1) {
          // Guard: only add if the conversation object is valid (the backend
          // should always send it, but protect against serialisation edge-cases)
          if (!data.conversation) return prev;
          list.unshift(data.conversation);
          idx = 0;
        } else {
          list[idx] = { ...list[idx], latestmessage: data.message.text };
          if (activeChatId !== data.message.conversationId) {
            list[idx] = {
              ...list[idx],
              unreadCounts: list[idx].unreadCounts.map((u) =>
                u.userId === user._id ? { ...u, count: u.count + 1 } : u
              ),
              updatedAt: new Date().toISOString(),
            };
          }
          const [moved] = list.splice(idx, 1);
          list.unshift(moved);
        }
        return list;
      });

      if (activeChatId !== data.message.conversationId) {
        soundRef.current.play().catch(() => { });
        toast({
          status: "success",
          duration: 5000,
          position: "top-right",
          render: () => (
            <NewMessage
              data={data}
              handleChatOpen={handleChatOpen}
            />
          ),
        });
      }
    };

    socket.on("new-message-notification", onNotification);
    return () => {
      socket.off("new-message-notification", onNotification);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId, user._id]);

  /* ─── search ─────────────────────────────────────────────────────────── */
  const handleSearch = useCallback(
    (e) => {
      const q = e.target.value.toLowerCase();
      if (!q) {
        setMyChatList(originalChatList);
        return;
      }
      setMyChatList(
        originalChatList.filter((c) =>
          c.members[0]?.name?.toLowerCase().includes(q)
        )
      );
    },
    [originalChatList, setMyChatList]
  );

  /* ─── open a chat ────────────────────────────────────────────────────── */
  const handleChatOpen = useCallback(
    async (chatId, receiver) => {
      try {
        setIsChatLoading(true);
        setMessageList([]);
        setIsOtherUserTyping(false);

        // Leave previous room
        if (activeChatId) {
          emitStopTyping({ typer: user._id, conversationId: activeChatId });
          emitLeaveChat(activeChatId);
        }

        // Join new room
        emitJoinChat(chatId);
        setActiveChatId(chatId);

        const messages = await messageApi.list(chatId);
        setMessageList(messages);
        setReceiver(receiver);
        setIsChatLoading(false);

        // Clear unread count for this chat
        setMyChatList((prev) =>
          prev.map((c) =>
            c._id === chatId
              ? {
                ...c,
                unreadCounts: c.unreadCounts.map((u) =>
                  u.userId === user._id ? { ...u, count: 0 } : u
                ),
              }
              : c
          )
        );

        // Focus message input
        setTimeout(() => messageInputRef.current?.focus(), 100);
      } catch (err) {
        console.error("Failed to open chat:", err);
        setIsChatLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeChatId, user._id]
  );

  /* ─── render ─────────────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <Box flex={1} p={3} overflow="hidden">
        {/* Header */}
        <Flex justify="space-between" align="center" mb={3}>
          <Skeleton height="28px" width="70px" borderRadius="md" />
          <Skeleton height="36px" width="150px" borderRadius="md" />
        </Flex>
        <Skeleton height="1px" mb={3} />
        <Skeleton height="36px" borderRadius="md" mb={4} />
        {/* Chat-list rows */}
        <Stack spacing={1}>
          {Array.from({ length: 9 }).map((_, i) => (
            <Flex key={i} align="center" px={2} py={3} borderRadius="lg">
              <SkeletonCircle size="10" flexShrink={0} />
              <Box ml={3} flex={1} overflow="hidden">
                <Skeleton height="15px" width={`${55 + (i % 3) * 10}%`} mb={2} borderRadius="md" />
                <Skeleton height="12px" width={`${40 + (i % 4) * 8}%`} borderRadius="md" />
              </Box>
              <Stack ml={3} spacing={1} align="flex-end" flexShrink={0}>
                <Skeleton height="10px" width="32px" borderRadius="md" />
                <Skeleton height="10px" width="24px" borderRadius="md" />
              </Stack>
            </Flex>
          ))}
        </Stack>
      </Box>
    );
  }

  return (
    <>
      <Flex direction="column" flex={1} overflow="hidden" mt={1}>
        {/* Header */}
        <Flex justify="space-between" align="center" flexShrink={0}>
          <Text fontWeight="bold" fontSize="2xl">
            Chats
          </Text>
          <Flex align="center" gap={2}>
            <InputGroup w="auto">
              <InputLeftElement pointerEvents="none">
                <Search2Icon color="gray.300" />
              </InputLeftElement>
              <Input
                type="text"
                placeholder="Search user"
                onChange={handleSearch}
              />
            </InputGroup>
            <Box display={{ base: "block", lg: "none" }}>
              <ProfileMenu isOpen={isOpen} onOpen={onOpen} onClose={onClose} />
            </Box>
          </Flex>
        </Flex>

        <Divider my={2} />

        <Button
          mx={2}
          my={1}
          flexShrink={0}
          colorScheme="purple"
          onClick={() => setActiveTab(1)}
        >
          Add new Chat <AddIcon ml={2} fontSize="12px" />
        </Button>

        {/* Chat list */}
        <Box flex={1} overflowY="auto" px={2} sx={scrollbarSx}>
          {chatList.map((chat) => {
            const member = chat.members[0];
            const unread =
              chat.unreadCounts?.find((u) => u.userId === user._id)?.count || 0;

            return (
              <Flex key={chat._id} my={2}>
                <Button
                  h="4em"
                  w="100%"
                  justifyContent="space-between"
                  onClick={() => handleChatOpen(chat._id, member)}
                  colorScheme={chat._id === activeChatId ? "purple" : "gray"}
                >
                  <Flex align="center" overflow="hidden">
                    <img
                      src={member?.profilePic || "https://via.placeholder.com/150"}
                      alt="profile"
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        flexShrink: 0,
                      }}
                    />
                    <Box ml={3} textAlign="left" overflow="hidden">
                      <Text fontSize="lg" fontWeight="bold" isTruncated>
                        {member?.name}
                      </Text>
                      {(typingConversations[chat._id] || (isOtherUserTyping && chat._id === activeChatId)) ? (
                        <Text fontSize="sm" color={colorMode === "light" ? (chat._id === activeChatId ? "gray.200" : "gray.500") : (chat._id === activeChatId ? "gray.700" : "gray.400")} isTruncated>
                          typing...
                        </Text>
                      ) : (
                        <Text fontSize="sm" color={colorMode === "light" ? (chat._id === activeChatId ? "gray.200" : "gray.500") : (chat._id === activeChatId ? "gray.700" : "gray.400")} isTruncated>
                          {chat.latestmessage}
                        </Text>
                      )}
                    </Box>
                  </Flex>

                  <Stack direction="row" align="center" flexShrink={0} ml={2}>
                    <Box textAlign="right" fontSize="x-small">
                      <Text mb={1}>{formatDateLabel(chat.updatedAt)}</Text>
                      <Text>{formatTime(chat.updatedAt)}</Text>
                    </Box>
                    {unread > 0 && (
                      <Circle bg="black" color="white" size="20px" p={1}>
                        <Text fontSize={12}>{unread}</Text>
                      </Circle>
                    )}
                  </Stack>
                </Button>
              </Flex>
            );
          })}
        </Box>
      </Flex>

      <ProfileModal isOpen={isOpen} onClose={onClose} user={user} />
    </>
  );
};

export default MyChatList;
