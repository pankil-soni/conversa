import { useState, useContext, useEffect } from "react";
import {
  Box,
  Flex,
  Text,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Link,
} from "@chakra-ui/react";
import Auth from "./Authentication/Auth";
import chatContext from "../context/chatContext";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const { isAuthenticated } = useContext(chatContext);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [tabIndex, setTabIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard");
  }, [isAuthenticated, navigate]);

  const openAuth = (idx) => {
    setTabIndex(idx);
    onOpen();
  };

  return (
    <Flex direction="column" flex={1} overflow="hidden">
      {/* Hero area */}
      <Flex direction="column" align="center" justify="center" flex={1}>
        <Text fontSize={{ base: "5xl", lg: "7xl" }} fontWeight="bold">
          Conversa
        </Text>
        <Text fontSize="xl" fontWeight="bold" mb={4}>
          Online Chatting App
        </Text>
        <Box>
          <Button mr={3} onClick={() => openAuth(0)}>
            Login
          </Button>
          <Button colorScheme="purple" onClick={() => openAuth(1)}>
            Sign Up
          </Button>
        </Box>
      </Flex>

      {/* Footer */}
      <Text fontSize="sm" textAlign="center" py={2} flexShrink={0}>
        &copy; {new Date().getFullYear()} Conversa. All rights reserved.{" "}
        <Link
          href="https://github.com/pankil-soni"
          isExternal
          color="purple.500"
          textDecoration="underline"
        >
          Pankil Soni
        </Link>
      </Text>

      {/* Auth modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size={{ base: "md", lg: "xl" }}
      >
        <ModalOverlay />
        <ModalContent w={{ base: "95vw" }}>
          <ModalCloseButton />
          <ModalBody pt={10} pb={6}>
            <Auth tabIndex={tabIndex} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Flex>
  );
};

export default Home;
