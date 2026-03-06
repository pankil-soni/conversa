import React, { useState } from "react";
import {
  Box,
  Image,
  Text,
  Button,
  Tooltip,
  Flex,
  Circle,
  Stack,
  useDisclosure,
} from "@chakra-ui/react";
import { CopyIcon, DeleteIcon, CheckCircleIcon } from "@chakra-ui/icons";
import DeleteMessageModal from "../miscellaneous/DeleteMessageModal";
import { emitDeleteMessage } from "../../lib/socket";
import { formatTime } from "../../lib/utils";

const SingleMessage = ({
  message,
  user,
  receiver,
  markdownToHtml,
  scrollbarSx,
  activeChatId,
  removeMessageFromList,
  toast,
}) => {
  const isSender = message.senderId === user._id;
  const [isHovered, setIsHovered] = useState(false);
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text).then(() => {
      toast({
        duration: 1000,
        render: () => (
          <Box color="white" p={3} bg="purple.300" borderRadius="lg">
            Message copied to clipboard!
          </Box>
        ),
      });
    });
  };

  const handleDelete = (scope) => {
    removeMessageFromList(message._id);
    onDeleteClose();

    const deleteFrom = [user._id];
    if (scope === 2) deleteFrom.push(receiver._id);

    emitDeleteMessage({
      messageId: message._id,
      conversationId: activeChatId,
      deleteFrom,
    });
  };

  return (
    <>
      <Flex
        justify={isSender ? "end" : "start"}
        mx={2}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Sender hover controls (left side) */}
        {isSender && isHovered && (
          <Flex align="center" mr={1}>
            <Tooltip label="Copy" placement="top">
              <Button size="sm" variant="ghost" onClick={handleCopy} borderRadius="md">
                <CopyIcon />
              </Button>
            </Tooltip>
            <Tooltip label="Delete" placement="top">
              <Button size="sm" variant="ghost" onClick={onDeleteOpen} borderRadius="md">
                <DeleteIcon />
              </Button>
            </Tooltip>
          </Flex>
        )}

        <Flex w="max-content" position="relative">
          {/* Receiver avatar */}
          {!isSender && receiver?.profilePic && (
            <Image
              borderRadius="50%"
              src={receiver.profilePic}
              alt="Sender"
              w="20px"
              h="20px"
              mr={1}
              alignSelf="center"
            />
          )}

          <Stack spacing={0} position="relative">
            {/* Reply indicator */}
            {message.replyto && (
              <Box
                my={1}
                p={2}
                borderRadius={10}
                bg={isSender ? "purple.200" : "blue.200"}
                mx={2}
                color="white"
                w="max-content"
                maxW="60vw"
                alignSelf={isSender ? "flex-end" : "flex-start"}
              >
                reply to
              </Box>
            )}

            {/* Message bubble */}
            <Box
              alignSelf={isSender ? "flex-end" : "flex-start"}
              position="relative"
              my={1}
              p={2}
              borderRadius={10}
              bg={isSender ? "purple.300" : "blue.300"}
              color="white"
              w="max-content"
              maxW="60vw"
            >
              {message.imageUrl && (
                <Image
                  src={message.imageUrl}
                  alt="attachment"
                  w="200px"
                  maxW="40vw"
                  borderRadius="10px"
                  mb={2}
                />
              )}
              <Text
                overflowX="auto"
                sx={scrollbarSx}
                dangerouslySetInnerHTML={markdownToHtml(message.text)}
              />
              <Flex justify="end" align="center" mt={1}>
                <Text align="end" fontSize="10px" color="#e6e5e5">
                  {formatTime(message.createdAt)}
                </Text>
                {isSender &&
                  message.seenBy?.some((s) => s.user === receiver._id) && (
                    <Circle ml={1} fontSize="x-small" color="green.100">
                      <CheckCircleIcon />
                    </Circle>
                  )}
              </Flex>

              {/* Receiver hover controls (right side) */}
              {!isSender && isHovered && (
                <Box position="absolute" top={0} right="-50px" display="flex">
                  <Tooltip label="Copy" placement="top">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCopy}
                      borderRadius="md"
                    >
                      <CopyIcon />
                    </Button>
                  </Tooltip>
                </Box>
              )}
            </Box>
          </Stack>
        </Flex>
      </Flex>

      <DeleteMessageModal
        isOpen={isDeleteOpen}
        handleDeleteMessage={handleDelete}
        onClose={onDeleteClose}
      />
    </>
  );
};

export default SingleMessage;
