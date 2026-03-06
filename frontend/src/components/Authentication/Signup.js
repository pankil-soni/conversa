import { useState } from "react";
import {
  Flex,
  Heading,
  Input,
  Button,
  InputGroup,
  Stack,
  InputLeftElement,
  Box,
  Link,
  Avatar,
  FormControl,
  InputRightElement,
  Card,
  CardBody,
  useToast,
} from "@chakra-ui/react";
import { LockIcon } from "@chakra-ui/icons";
import { authApi } from "../../lib/api";

const Signup = ({ onSwitchTab }) => {
  const toast = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const showError = (description) =>
    toast({
      title: "An error occurred",
      description,
      status: "error",
      duration: 5000,
      isClosable: true,
    });

  const handleSignup = async (e) => {
    e.preventDefault();

    /* ── client-side validation ─────────────────────────────────────── */
    if (!email || !name || !password) return showError("All fields are required");
    if (name.length < 3 || name.length > 20)
      return showError("Name must be 3–20 characters");
    if (!email.includes("@") || !email.includes("."))
      return showError("Invalid email");
    if (email.length > 50) return showError("Email must be at most 50 characters");
    if (password.length < 8 || password.length > 20)
      return showError("Password must be 8–20 characters");
    if (password !== confirmPassword) return showError("Passwords do not match");

    /* ── register ───────────────────────────────────────────────────── */
    toast.promise(
      authApi.register({ email, name, password }).then((data) => {
        localStorage.setItem("token", data.authtoken);
        onSwitchTab(0); // switch to login tab
      }),
      {
        loading: { title: "Creating account…", description: "Please wait" },
        success: {
          title: "Account created",
          description: "You can now log in.",
        },
        error: {
          title: "An error occurred",
          description: "We were unable to create your account.",
        },
      }
    );
  };

  return (
    <Flex
      direction="column"
      justify="center"
      align="center"
      flex={1}
      py={6}
    >
      <Stack direction="column" align="center" spacing={3} w="100%">
        <Avatar bg="purple.300" />
        <Heading size="lg">Welcome</Heading>

        <Card
          minW={{ base: "90%", lg: "468px" }}
          borderRadius={15}
          shadow="none"
        >
          <CardBody p={0}>
            <form onSubmit={handleSignup}>
              <Stack spacing={4}>
                {/* Name */}
                <FormControl>
                  <InputGroup size="lg" borderRadius="10px">
                    <Input
                      type="text"
                      placeholder="Enter your name"
                      focusBorderColor="purple.500"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </InputGroup>
                </FormControl>

                {/* Email */}
                <FormControl>
                  <InputGroup size="lg" borderRadius="10px">
                    <Input
                      type="email"
                      placeholder="Email address"
                      focusBorderColor="purple.500"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </InputGroup>
                </FormControl>

                {/* Password */}
                <FormControl>
                  <InputGroup size="lg" borderRadius="10px">
                    <InputLeftElement pointerEvents="none">
                      <LockIcon color="gray.300" />
                    </InputLeftElement>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      focusBorderColor="purple.500"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <InputRightElement mx={1}>
                      <Button
                        fontSize="x-small"
                        size="xs"
                        onClick={() => setShowPassword((p) => !p)}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </Button>
                    </InputRightElement>
                  </InputGroup>

                  {/* Confirm Password */}
                  <InputGroup size="lg" borderRadius="10px" mt={4}>
                    <InputLeftElement pointerEvents="none">
                      <LockIcon color="gray.300" />
                    </InputLeftElement>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm Password"
                      focusBorderColor="purple.500"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <InputRightElement mx={1}>
                      <Button
                        fontSize="x-small"
                        size="xs"
                        onClick={() => setShowPassword((p) => !p)}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </Button>
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                <Button
                  borderRadius={10}
                  type="submit"
                  colorScheme="purple"
                  width="full"
                >
                  Sign Up
                </Button>
              </Stack>
            </form>
          </CardBody>
        </Card>
      </Stack>

      <Box mt={4}>
        Already have an account?{" "}
        <Link color="purple.500" onClick={() => onSwitchTab(0)}>
          Login
        </Link>
      </Box>
    </Flex>
  );
};

export default Signup;
