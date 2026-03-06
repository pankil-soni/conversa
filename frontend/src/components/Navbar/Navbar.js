import { useState } from "react";
import {
  Box,
  Button,
  Flex,
  Text,
  Link,
  useDisclosure,
  useColorMode,
} from "@chakra-ui/react";
import { FaGithub, FaMoon, FaSun } from "react-icons/fa";
import ProfileMenu from "./ProfileMenu";

const Navbar = ({ toggleColorMode, isAuthenticated }) => {
  const { colorMode } = useColorMode();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [icon, setIcon] = useState(
    colorMode === "dark" ? <FaSun /> : <FaMoon />
  );
  const isDashboard = window.location.pathname.includes("dashboard");

  const handleToggle = () => {
    setIcon(colorMode === "dark" ? <FaMoon /> : <FaSun />);
    toggleColorMode();
  };

  const iconButton = (
    <Button
      onClick={handleToggle}
      borderRadius="full"
      borderWidth={1}
      fontSize="small"
      bg="transparent"
      p={3}
    >
      {icon}
    </Button>
  );

  const githubButton = (
    <Link
      href="https://github.com/pankil-soni"
      isExternal
      display="flex"
      alignItems="center"
      justifyContent="center"
      borderRadius="full"
      borderWidth={1}
      fontSize="small"
      bg="transparent"
      p={3}
    >
      <FaGithub />
    </Link>
  );

  return (
    <>
      {/* Mobile-only floating buttons (hidden on dashboard) */}
      {!isDashboard && (
        <Box
          position="absolute"
          top={5}
          left={5}
          display={{ lg: "none", base: "flex" }}
          gap={1}
        >
          {iconButton}
          {githubButton}
        </Box>
      )}

      {/* Desktop navbar */}
      <Box
        px={4}
        py={3}
        mx={2}
        mt={2}
        borderRadius="10px"
        borderWidth="2px"
        display={{ base: "none", lg: "block" }}
        flexShrink={0}
      >
        <Flex justify="space-between" align="center">
          <Text fontSize="2xl" fontWeight="bold">
            Conversa
          </Text>

          <Flex align="center" gap={2}>
            {iconButton}
            {githubButton}
            {isAuthenticated && (
              <ProfileMenu isOpen={isOpen} onOpen={onOpen} onClose={onClose} />
            )}
          </Flex>
        </Flex>
      </Box>
    </>
  );
};

export default Navbar;
