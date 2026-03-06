import { useState, useContext } from "react";
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
  FormHelperText,
  InputRightElement,
  Card,
  CardBody,
  useToast,
  Spinner,
  Tooltip,
} from "@chakra-ui/react";
import { LockIcon, ArrowBackIcon } from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";
import chatContext from "../../context/chatContext";
import { authApi } from "../../lib/api";
import { connectSocket, emitSetup } from "../../lib/socket";

const Login = ({ onSwitchTab }) => {
  const { setUser, setIsAuthenticated, fetchConversations } =
    useContext(chatContext);
  const toast = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const notify = (title, description, status) =>
    toast({ title, description, status, duration: 5000, isClosable: true });

  /* ─── login ──────────────────────────────────────────────────────────── */
  const handleLogin = async (e) => {
    e.preventDefault();
    const payload = { email };
    if (forgotMode && otp) {
      payload.otp = otp;
    } else {
      payload.password = password;
    }

    try {
      const data = await authApi.login(payload);
      notify("Login successful", "You are now logged in", "success");
      localStorage.setItem("token", data.authtoken);
      setUser(data.user);
      connectSocket(data.authtoken);
      emitSetup();
      setIsAuthenticated(true);
      fetchConversations();
      navigate("/dashboard");
    } catch (err) {
      notify("An error occurred", err.message, "error");
    }
  };

  /* ─── send otp ───────────────────────────────────────────────────────── */
  const handleSendOtp = async () => {
    setSendingOtp(true);
    try {
      await authApi.sendOtp(email);
      notify("OTP sent", "Check your email for the OTP", "success");
    } catch (err) {
      notify("An error occurred", err.message, "error");
    } finally {
      setSendingOtp(false);
    }
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
        <Heading size="lg">Welcome Back</Heading>

        <Card
          minW={{ base: "90%", lg: "468px" }}
          borderRadius={15}
          shadow="none"
        >
          <CardBody p={0}>
            <form onSubmit={handleLogin}>
              <Stack spacing={4}>
                {forgotMode && (
                  <Tooltip label="Back to login">
                    <Button
                      w="fit-content"
                      onClick={() => setForgotMode(false)}
                    >
                      <ArrowBackIcon />
                    </Button>
                  </Tooltip>
                )}

                {/* Email */}
                <FormControl display="flex">
                  <InputGroup size="lg" borderRadius="10px">
                    <Input
                      type="email"
                      placeholder="Email address"
                      focusBorderColor="purple.500"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </InputGroup>
                  {forgotMode && (
                    <Button
                      m={1}
                      fontSize="sm"
                      onClick={handleSendOtp}
                      isDisabled={sendingOtp}
                    >
                      {sendingOtp ? <Spinner size="sm" /> : "Send OTP"}
                    </Button>
                  )}
                </FormControl>

                {/* Password (normal mode) */}
                {!forgotMode && (
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
                    <FormHelperText textAlign="right">
                      <Link onClick={() => setForgotMode(true)}>
                        Forgot password?
                      </Link>
                    </FormHelperText>
                  </FormControl>
                )}

                {/* OTP (forgot mode) */}
                {forgotMode && (
                  <FormControl>
                    <InputGroup size="lg" borderRadius="10px">
                      <Input
                        type="number"
                        placeholder="Enter OTP"
                        focusBorderColor="purple.500"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                      />
                    </InputGroup>
                  </FormControl>
                )}

                <Button
                  borderRadius={10}
                  type="submit"
                  colorScheme="purple"
                  width="full"
                >
                  {forgotMode ? "Login using OTP" : "Login"}
                </Button>
              </Stack>
            </form>
          </CardBody>
        </Card>
      </Stack>

      <Box mt={4}>
        New to us?{" "}
        <Link color="purple.500" onClick={() => onSwitchTab(1)}>
          Sign Up
        </Link>
      </Box>
    </Flex>
  );
};

export default Login;
