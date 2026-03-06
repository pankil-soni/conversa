import { useState, useContext, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Tabs,
  TabPanels,
  TabPanel,
  Button,
  Input,
  Stack,
  Text,
  Image,
  Box,
  useToast,
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import chatContext from "../../context/chatContext";
import { userApi } from "../../lib/api";

export const ProfileModal = ({ isOpen, onClose, user, setUser }) => {
  const { user: currentUser, setUser: setGlobalUser } = useContext(chatContext);
  const [editing, setEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(user);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const toast = useToast();

  // Sync editedUser when user prop changes
  useEffect(() => {
    setEditedUser(user);
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    // Optimistic update
    if (setUser) setUser(editedUser);
    setGlobalUser(editedUser);

    try {
      await userApi.updateProfile(editedUser);
      toast({
        title: "Profile updated",
        description: "Your profile was updated successfully",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      setEditing(false);
    } catch (err) {
      toast({
        title: "An error occurred",
        description: err.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const isOwnProfile = user._id === currentUser?._id;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader p={6} borderBottomWidth="1px" borderColor="gray.100">
          <Text fontSize="xl" fontWeight="bold">
            Profile
          </Text>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <Tabs
            isFitted
            variant="enclosed"
            index={editing ? 1 : 0}
            onChange={(idx) => setEditing(idx === 1)}
          >
            <TabPanels>
              {/* View tab */}
              <TabPanel>
                <Stack spacing={2}>
                  <Image
                    borderRadius="full"
                    boxSize={{ base: "100px", lg: "150px" }}
                    src={user.profilePic}
                    alt="profile"
                    mx="auto"
                  />
                  <Text fontSize="xx-large" fontWeight="bold">
                    {user.name}
                  </Text>
                  <Text fontSize="md">About: {user.about}</Text>
                  {!user.isBot && (
                    <Text fontSize="md">Email: {user.email}</Text>
                  )}
                </Stack>
              </TabPanel>

              {/* Edit tab */}
              <TabPanel>
                <Stack spacing={4}>
                  <Image
                    borderRadius="full"
                    boxSize={{ base: "100px", lg: "150px" }}
                    src={user.profilePic}
                    alt="profile"
                    mx="auto"
                  />
                  <Input
                    name="name"
                    placeholder="Name"
                    value={editedUser.name || ""}
                    onChange={handleChange}
                  />
                  <Input
                    name="about"
                    placeholder="About"
                    value={editedUser.about || ""}
                    onChange={handleChange}
                  />
                  <Button
                    onClick={() => setShowChangePassword((p) => !p)}
                  >
                    Change my password{" "}
                    {showChangePassword ? (
                      <ChevronUpIcon />
                    ) : (
                      <ChevronDownIcon />
                    )}
                  </Button>
                  {showChangePassword && (
                    <Box>
                      <Input
                        name="oldpassword"
                        placeholder="Old password"
                        type="password"
                        onChange={handleChange}
                        mb={2}
                      />
                      <Input
                        name="newpassword"
                        placeholder="New password"
                        type="password"
                        onChange={handleChange}
                      />
                    </Box>
                  )}
                </Stack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>

        <ModalFooter>
          {editing ? (
            <>
              <Button colorScheme="purple" mr={3} onClick={handleSave}>
                Save
              </Button>
              <Button onClick={() => setEditing(false)}>Back</Button>
            </>
          ) : (
            isOwnProfile && (
              <Button colorScheme="purple" mr={3} onClick={() => setEditing(true)}>
                Edit
              </Button>
            )
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
