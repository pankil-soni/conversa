import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  fonts: {
    heading: "'Work Sans', sans-serif",
    body: "'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  styles: {
    global: {
      "html, body, #root": {
        height: "100%",
        margin: 0,
        padding: 0,
        overflow: "hidden",
      },
    },
  },
  config: {
    initialColorMode: "light",
    useSystemColorMode: false,
  },
});

export default theme;
