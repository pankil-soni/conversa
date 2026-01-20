import React, { useContext } from "react";
import {
  Button,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Image,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";
import { ProfileModal } from "../miscellaneous/ProfileModal";
import { useColorMode } from "@chakra-ui/react";
import chatContext from "../../context/chatContext";

const ProfileMenu = (props) => {
  const { toggleColorMode } = useColorMode();
  const context = useContext(chatContext);
  const {
    user,
    setUser,
    setIsAuthenticated,
    setActiveChatId,
    setMessageList,
    setReceiver,
  } = context;
  const navigator = useNavigate();

  const handleLogout = async (e) => {
    e.preventDefault();
    setUser({});
    setMessageList([]);
    setActiveChatId("");
    setReceiver({});
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    console.log("logout");
    navigator("/");
  };
  return (
    <>
      <Menu>
        {
          <>
            <MenuButton
              isActive={props.isOpen}
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
              <Text
                display={{
                  base: "none",
                  lg: "block",
                }}
                fontSize={"13px"}
              >
                {user.name}
              </Text>
            </MenuButton>
            <MenuList>
              <MenuItem onClick={props.onOpen}>MyProfile</MenuItem>
              <MenuItem
                display={{
                  base: "block",
                  lg: "none",
                }}
                onClick={toggleColorMode}
              >
                {localStorage.getItem("chakra-ui-color-mode") === "light"
                  ? "Dark Mode"
                  : "Light Mode"}
              </MenuItem>
              <MenuItem color={"red"} onClick={handleLogout}>
                Logout
              </MenuItem>
            </MenuList>
          </>
        }
      </Menu>
      <ProfileModal
        isOpen={props.isOpen}
        onClose={props.onClose}
        user={user}
        setUser={setUser}
      />
    </>
  );
};

export default ProfileMenu;
