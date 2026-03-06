import { Box, Flex, Skeleton, SkeletonCircle, Stack } from "@chakra-ui/react";
import React from "react";

const ChatLoadingSpinner = () => {
  return (
    <Box flex={1} px={5} py={4} overflow="hidden">
      <Stack spacing={4}>
        <Flex justify="flex-start" align="flex-end" gap={2}>
          <SkeletonCircle size="8" flexShrink={0} />
          <Skeleton height="44px" width="54%" borderRadius="xl" />
        </Flex>
        <Flex justify="flex-end">
          <Skeleton height="44px" width="40%" borderRadius="xl" />
        </Flex>
        <Flex justify="flex-start" align="flex-end" gap={2}>
          <SkeletonCircle size="8" flexShrink={0} />
          <Skeleton height="66px" width="60%" borderRadius="xl" />
        </Flex>
        <Flex justify="flex-end">
          <Skeleton height="44px" width="32%" borderRadius="xl" />
        </Flex>
        <Flex justify="flex-start" align="flex-end" gap={2}>
          <SkeletonCircle size="8" flexShrink={0} />
          <Skeleton height="44px" width="48%" borderRadius="xl" />
        </Flex>
        <Flex justify="flex-end">
          <Skeleton height="80px" width="52%" borderRadius="xl" />
        </Flex>
        <Flex justify="flex-start" align="flex-end" gap={2}>
          <SkeletonCircle size="8" flexShrink={0} />
          <Skeleton height="44px" width="36%" borderRadius="xl" />
        </Flex>
      </Stack>
    </Box>
  );
};

export default ChatLoadingSpinner;
