import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  fonts: {
    heading: `'Merriweather', serif`,
    body: `'Nunito', sans-serif`,
  },
  colors: {
    cottage: {
      bg: "#FDFBF7",      // Oatmeal
      paper: "#FFFDF5",   // Cream
      text: "#4A4036",    // Coffee
      Sage500: "#8DA399", // Leaves
      Sage600: "#6B8278",
      Rose500: "#D4A3A3", // Dusty Rose
      Terra500: "#C7826B", // Clay
    },
  },
  styles: {
    global: {
      body: { bg: "cottage.bg", color: "cottage.text" },
    },
  },
  components: {
    Button: {
      baseStyle: { borderRadius: "2xl", fontWeight: "bold" },
      variants: {
        solid: {
          bg: "cottage.Sage500",
          color: "white",
          _hover: { bg: "cottage.Sage600", transform: "translateY(-2px)" },
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: "3xl",
          bg: "cottage.paper",
          boxShadow: "sm",
          border: "1px solid",
          borderColor: "cottage.Sage500",
        },
      },
    },
  },
});

export default theme;
