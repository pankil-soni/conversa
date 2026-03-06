import {
  Flex,
  Text,
  Button,
  Image,
  Tooltip,
  SkeletonCircle,
  Skeleton,
  Circle,
  Stack,
  useDisclosure,
} from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
import { useContext, useEffect } from "react";
import chatContext from "../../context/chatContext";
import { ProfileModal } from "../miscellaneous/ProfileModal";
import { userApi } from "../../lib/api";
import { emitLeaveChat } from "../../lib/socket";
import { getLastSeenString } from "../../lib/utils";

const ChatAreaTop = () => {
  const {
    receiver,
    setReceiver,
    activeChatId,
    setActiveChatId,
    setMessageList,
    isChatLoading,
  } = useContext(chatContext);

  const { isOpen, onOpen, onClose } = useDisclosure();

  /* ─── fetch online status when receiver changes ──────────────────────── */
  useEffect(() => {
    if (!receiver?._id) return;
    let cancelled = false;
    userApi
      .getOnlineStatus(receiver._id)
      .then((data) => {
        if (!cancelled) {
          setReceiver((prev) => ({ ...prev, isOnline: data.isOnline }));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiver?._id]);

  const handleBack = () => {
    emitLeaveChat(activeChatId);
    setActiveChatId("");
    setMessageList([]);
    setReceiver({});
  };

  return (
    <>
      <Flex w="100%" flexShrink={0}>
        <Button borderRadius={0} h="inherit" onClick={handleBack}>
          <ArrowBackIcon />
        </Button>

        <Tooltip label="View Profile">
          <Button
            flex={1}
            p={2}
            h="max-content"
            justifyContent="flex-start"
            borderRadius={0}
            onClick={onOpen}
          >
            {isChatLoading ? (
              <Flex align="center" gap={3} px={1}>
                <SkeletonCircle size="10" flexShrink={0} />
                <Stack spacing={2}>
                  <Skeleton height="18px" width="160px" borderRadius="md" />
                  <Skeleton height="11px" width="80px" borderRadius="md" />
                </Stack>
              </Flex>
            ) : (
              <Flex gap={2} align="center">
                <Image
                  borderRadius="full"
                  boxSize="40px"
                  src={receiver.profilePic}
                  alt=""
                />
                <Stack spacing={0} lineHeight={1} textAlign="left">
                  <Text
                    mx={1}
                    my={receiver.isOnline ? 0 : 2}
                    fontSize="2xl"
                  >
                    {receiver.name}
                  </Text>
                  {receiver.isOnline ? (
                    <Text as="span" display="block" mx={1} fontSize="small">
                      <Circle
                        size="2"
                        bg="green.500"
                        display="inline-block"
                        mx={1}
                      />
                      active now
                    </Text>
                  ) : (
                    <Text mx={1} fontSize="xx-small">
                      {getLastSeenString(receiver.lastSeen)}
                    </Text>
                  )}
                </Stack>
              </Flex>
            )}
          </Button>
        </Tooltip>
      </Flex>

      <ProfileModal isOpen={isOpen} onClose={onClose} user={receiver} />
    </>
  );
};

export default ChatAreaTop;
