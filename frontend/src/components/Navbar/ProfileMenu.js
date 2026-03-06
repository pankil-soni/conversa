import React, { useContext } from "react";
import {
  Button,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Image,
  useColorMode,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";
import { ProfileModal } from "../miscellaneous/ProfileModal";
import chatContext from "../../context/chatContext";
import { disconnectSocket } from "../../lib/socket";

const ProfileMenu = ({ isOpen, onOpen, onClose }) => {
  const { colorMode, toggleColorMode } = useColorMode();
  const {
    user,
    setUser,
    setIsAuthenticated,
    setActiveChatId,
    setMessageList,
    setReceiver,
  } = useContext(chatContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    setUser({});
    setMessageList([]);
    setActiveChatId("");
    setReceiver({});
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    disconnectSocket();
    setIsAuthenticated(false);
    navigate("/");
  };

  return (
    <>
      <Menu>
        <MenuButton
          isActive={isOpen}
          as={Button}
          rightIcon={<ChevronDownIcon />}
          leftIcon={
            <Image
              boxSize="26px"
              borderRadius="full"
              src={user.profilePic}
              alt="profile-pic"
            />
          }
        >
          <Text display={{ base: "none", lg: "block" }} fontSize="13px">
            {user.name}
          </Text>
        </MenuButton>

        <MenuList>
          <MenuItem onClick={onOpen}>My Profile</MenuItem>
          <MenuItem
            display={{ base: "block", lg: "none" }}
            onClick={toggleColorMode}
          >
            {colorMode === "light" ? "Dark Mode" : "Light Mode"}
          </MenuItem>
          <MenuItem color="red.500" onClick={handleLogout}>
            Logout
          </MenuItem>
        </MenuList>
      </Menu>

      <ProfileModal
        isOpen={isOpen}
        onClose={onClose}
        user={user}
        setUser={setUser}
      />
    </>
  );
};

export default ProfileMenu;
