import { useState, useEffect, useContext, useRef, useCallback } from "react";
import { ArrowForwardIcon } from "@chakra-ui/icons";
import Lottie from "react-lottie";
import animationData from "../../typingAnimation.json";
import {
  Box,
  InputGroup,
  Input,
  Text,
  InputRightElement,
  Button,
  FormControl,
  InputLeftElement,
  useToast,
  useDisclosure,
  Flex,
  useColorModeValue,
} from "@chakra-ui/react";
import { FaFileUpload } from "react-icons/fa";

import chatContext from "../../context/chatContext";
import ChatAreaTop from "./ChatAreaTop";
import FileUploadModal from "../miscellaneous/FileUploadModal";
import ChatLoadingSpinner from "../miscellaneous/ChatLoadingSpinner";
import SingleMessage from "./SingleMessage";
import socket from "../../lib/socket";
import {
  emitSendMessage,
  emitStopTyping,
  emitTyping,
  emitLeaveChat,
} from "../../lib/socket";
import { userApi } from "../../lib/api";
import { markdownToHtml, scrollbarSx } from "../../lib/utils";
import axios from "axios";

const lottieOptions = {
  loop: true,
  autoplay: true,
  animationData,
  rendererSettings: { preserveAspectRatio: "xMidYMid slice" },
};

export const ChatArea = () => {
  const {
    user,
    receiver,
    activeChatId,
    messageList,
    setMessageList,
    isOtherUserTyping,
    setIsOtherUserTyping,
    setActiveChatId,
    setReceiver,
    setMyChatList,
    isChatLoading,
  } = useContext(chatContext);

  const [typing, setTyping] = useState(false);
  const [messageText, setMessageText] = useState("");
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const chatBoxRef = useRef(null);
  const inputRef = useRef(null);
  const inputBg = useColorModeValue("white", "gray.800");

  /* ─── helpers ────────────────────────────────────────────────────────── */
  const scrollToBottom = useCallback((smooth = false) => {
    requestAnimationFrame(() => {
      chatBoxRef.current?.scrollTo({
        top: chatBoxRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    });
  }, []);

  /* ─── browser back button handling ───────────────────────────────────── */
  useEffect(() => {
    const onPopState = () => {
      if (activeChatId) emitLeaveChat(activeChatId);
      setActiveChatId("");
      setMessageList([]);
      setReceiver({});
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [activeChatId, setActiveChatId, setMessageList, setReceiver]);

  /* ─── socket listeners ───────────────────────────────────────────────── */
  useEffect(() => {
    const onJoinedRoom = (userId) => {
      if (userId === user._id) return;
      setMessageList((prev) =>
        prev.map((msg) => {
          if (msg.senderId !== user._id) return msg;
          const alreadySeen = msg.seenBy?.some((s) => s.user === userId);
          if (alreadySeen) return msg;
          return {
            ...msg,
            seenBy: [...(msg.seenBy || []), { user: userId, seenAt: new Date() }],
          };
        })
      );
    };

    const onTyping = (data) => {
      if (data.typer !== user._id) setIsOtherUserTyping(true);
    };
    const onStopTyping = (data) => {
      if (data.typer !== user._id) setIsOtherUserTyping(false);
    };

    const onReceiveMessage = (data) => {
      setMessageList((prev) => [...prev, data]);
      scrollToBottom(true);
    };

    const onMessageDeleted = ({ messageId }) => {
      setMessageList((prev) => prev.filter((m) => m._id !== messageId));
    };

    socket.on("user-joined-room", onJoinedRoom);
    socket.on("typing", onTyping);
    socket.on("stop-typing", onStopTyping);
    socket.on("receive-message", onReceiveMessage);
    socket.on("message-deleted", onMessageDeleted);

    return () => {
      socket.off("user-joined-room", onJoinedRoom);
      socket.off("typing", onTyping);
      socket.off("stop-typing", onStopTyping);
      socket.off("receive-message", onReceiveMessage);
      socket.off("message-deleted", onMessageDeleted);
    };
  }, [user._id, setMessageList, setIsOtherUserTyping, scrollToBottom]);

  /* ─── scroll to bottom on message list change ───────────────────────── */
  useEffect(() => {
    scrollToBottom();
  }, [messageList.length, scrollToBottom]);

  /* ─── typing indicator ───────────────────────────────────────────────── */
  const handleInputChange = (e) => {
    const val = e.target.value;
    setMessageText(val);

    if (val && !typing) {
      setTyping(true);
      emitTyping({ typer: user._id, conversationId: activeChatId, receiverId: receiver._id });
    } else if (!val && typing) {
      setTyping(false);
      emitStopTyping({ typer: user._id, conversationId: activeChatId, receiverId: receiver._id });
    }
  };

  /* ─── get presigned URL ──────────────────────────────────────────────── */
  const getPresignedUrl = async (fileName, fileType) => {
    try {
      return await userApi.getPresignedUrl(fileName, fileType);
    } catch (err) {
      toast({ title: err.message, status: "error", duration: 3000, isClosable: true });
    }
  };

  /* ─── send message ───────────────────────────────────────────────────── */
  const handleSendMessage = async (e, text, file) => {
    e.preventDefault();
    const awsHost = "https://conversa-chat.s3.ap-south-1.amazonaws.com/";
    const finalText = text ?? messageText;

    emitStopTyping({ typer: user._id, conversationId: activeChatId, receiverId: receiver._id });
    setTyping(false);

    if (!finalText && !file) {
      toast({ title: "Message cannot be empty", status: "warning", duration: 3000, isClosable: true });
      return;
    }

    let key;
    if (file) {
      try {
        const { url, fields } = await getPresignedUrl(file.name, file.type);
        const formData = new FormData();
        Object.entries({ ...fields, file }).forEach(([k, v]) => formData.append(k, v));
        const res = await axios.post(url, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (res.status !== 201) throw new Error("Failed to upload file");
        key = fields.key;
      } catch (err) {
        toast({ title: err.message, status: "error", duration: 3000, isClosable: true });
        return;
      }
    }

    emitSendMessage({
      text: finalText,
      conversationId: activeChatId,
      imageUrl: file ? `${awsHost}${key}` : null,
    });

    setMessageText("");
    if (inputRef.current) inputRef.current.value = "";

    setMyChatList((prev) =>
      prev
        .map((c) =>
          c._id === activeChatId
            ? { ...c, latestmessage: finalText, updatedAt: new Date().toISOString() }
            : c
        )
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    );
  };

  const removeMessageFromList = (messageId) => {
    setMessageList((prev) => prev.filter((m) => m._id !== messageId));
  };

  /* ─── empty state ────────────────────────────────────────────────────── */
  if (!activeChatId) {
    return (
      <Flex
        display={{ base: "none", lg: "flex" }}
        direction="column"
        align="center"
        justify="center"
        flex={1}
      >
        <Text fontSize="5xl" fontWeight="bold">
          Conversa
        </Text>
        <Text fontSize="xl">Online chatting app</Text>
        <Text fontSize="md" color="gray.500" mt={2}>
          Select a chat to start messaging
        </Text>
      </Flex>
    );
  }

  /* ─── active chat ────────────────────────────────────────────────────── */
  return (
    <>
      <Flex direction="column" h="100%" overflow="hidden">
        {/* Top bar */}
        <ChatAreaTop />

        {/* Loading */}
        {isChatLoading && <ChatLoadingSpinner />}

        {/* Messages */}
        <Box ref={chatBoxRef} flex={1} overflowY="auto" sx={scrollbarSx} pt={1} mx={1}>
          {messageList?.map((message) =>
            <SingleMessage
              key={message._id}
              message={message}
              user={user}
              receiver={receiver}
              markdownToHtml={markdownToHtml}
              scrollbarSx={scrollbarSx}
              activeChatId={activeChatId}
              removeMessageFromList={removeMessageFromList}
              toast={toast}
            />
          )}
        </Box>

        {/* Typing indicator + input (flex-shrink: 0, no position: fixed) */}
        <Box flexShrink={0} bg={inputBg} px={2} py={{ base: 2, lg: 1 }}>
          {isOtherUserTyping && (
            <Box ml={3} mb={1} w="fit-content">
              <Lottie
                options={lottieOptions}
                height={20}
                width={20}
                isStopped={false}
                isPaused={false}
              />
            </Box>
          )}
          <FormControl>
            <InputGroup>
              {!receiver?.isBot && (
                <InputLeftElement ml={1}>
                  <Button size="sm" onClick={onOpen} borderRadius="lg">
                    <FaFileUpload />
                  </Button>
                </InputLeftElement>
              )}
              <Input
                ref={inputRef}
                placeholder="Type a message"
                value={messageText}
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage(e)}
                borderRadius="10px"
                pl={!receiver?.isBot ? 12 : 4}
              />
              <InputRightElement mr={1}>
                <Button
                  onClick={(e) => handleSendMessage(e)}
                  size="sm"
                  borderRadius="10px"
                >
                  <ArrowForwardIcon />
                </Button>
              </InputRightElement>
            </InputGroup>
          </FormControl>
        </Box>
      </Flex>

      <FileUploadModal
        isOpen={isOpen}
        onClose={onClose}
        handleSendMessage={handleSendMessage}
      />
    </>
  );
};
