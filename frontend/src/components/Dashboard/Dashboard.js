import { useEffect, useContext } from "react";
import {
  Box,
  Flex,
  useToast,
  Skeleton,
  SkeletonCircle,
  Stack,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import chatContext from "../../context/chatContext";
import Chats from "./Chats";
import { ChatArea } from "./ChatArea";

const Dashboard = () => {
  const { isAuthenticated, activeChatId, isLoading } = useContext(chatContext);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "You are not logged in",
        description: "Please login to continue",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      navigate("/");
    }
  }, [isAuthenticated, navigate, toast]);

  if (isLoading) {
    return (
      <Flex
        flex={1}
        overflow="hidden"
        mx={{ base: 0, lg: 2 }}
        mt={{ base: 0, lg: 1 }}
        borderRadius={{ base: 0, lg: "lg" }}
        borderWidth={{ base: 0, lg: "2px" }}
      >
        {/* Sidebar skeleton — mirrors the real chat list */}
        <Box
          w={{ base: "100%", lg: "450px" }}
          flexShrink={0}
          display="flex"
          flexDirection="column"
          p={3}
          overflow="hidden"
        >
          {/* Header row: title + search */}
          <Flex justify="space-between" align="center" mb={3}>
            <Skeleton height="28px" width="70px" borderRadius="md" />
            <Skeleton height="36px" width="150px" borderRadius="md" />
          </Flex>
          <Skeleton height="1px" mb={3} />
          {/* "Add new Chat" button */}
          <Skeleton height="36px" borderRadius="md" mb={4} />
          {/* Chat-list rows */}
          <Stack spacing={1} flex={1} overflow="hidden">
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

        {/* Chat-area skeleton — mirrors header + bubbles + input */}
        <Box
          flex={1}
          display={{ base: "none", lg: "flex" }}
          flexDirection="column"
          overflow="hidden"
          borderLeftWidth="1px"
        >
          {/* Top bar */}
          <Flex align="center" px={3} py={2} borderBottomWidth="1px" flexShrink={0}>
            <Skeleton height="36px" width="36px" borderRadius="md" mr={2} />
            <SkeletonCircle size="10" mr={3} />
            <Stack spacing={2}>
              <Skeleton height="16px" width="160px" borderRadius="md" />
              <Skeleton height="11px" width="80px" borderRadius="md" />
            </Stack>
          </Flex>
          {/* Message bubbles */}
          <Box flex={1} px={5} py={4} overflow="hidden">
            <Stack spacing={4}>
              <Flex justify="flex-start">
                <Skeleton height="42px" width="52%" borderRadius="xl" />
              </Flex>
              <Flex justify="flex-end">
                <Skeleton height="42px" width="38%" borderRadius="xl" />
              </Flex>
              <Flex justify="flex-start">
                <Skeleton height="62px" width="58%" borderRadius="xl" />
              </Flex>
              <Flex justify="flex-end">
                <Skeleton height="42px" width="44%" borderRadius="xl" />
              </Flex>
              <Flex justify="flex-start">
                <Skeleton height="42px" width="46%" borderRadius="xl" />
              </Flex>
              <Flex justify="flex-end">
                <Skeleton height="72px" width="50%" borderRadius="xl" />
              </Flex>
              <Flex justify="flex-start">
                <Skeleton height="42px" width="35%" borderRadius="xl" />
              </Flex>
            </Stack>
          </Box>
          {/* Input row */}
          <Flex align="center" px={3} py={3} borderTopWidth="1px" gap={2} flexShrink={0}>
            <SkeletonCircle size="8" />
            <Skeleton height="40px" flex={1} borderRadius="full" />
            <SkeletonCircle size="8" />
          </Flex>
        </Box>
      </Flex>
    );
  }

  return (
    <Flex
      flex={1}
      overflow="hidden"
      mx={{ base: 0, lg: 2 }}
      mt={{ base: 0, lg: 1 }}
      borderRadius={{ base: 0, lg: "lg" }}
      borderWidth={{ base: 0, lg: "2px" }}
    >
      {/* Sidebar */}
      <Box
        display={{ base: activeChatId ? "none" : "flex", lg: "flex" }}
        flexDirection="column"
        w={{ base: "100%", lg: "450px" }}
        flexShrink={0}
        overflow="hidden"
      >
        <Chats />
      </Box>

      {/* Chat area */}
      <Box
        display={{ base: activeChatId ? "flex" : "none", lg: "flex" }}
        flexDirection="column"
        flex={1}
        overflow="hidden"
      >
        <ChatArea />
      </Box>
    </Flex>
  );
};

export default Dashboard;
