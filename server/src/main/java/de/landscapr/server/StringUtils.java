package de.landscapr.server;

import java.util.regex.Pattern;

public class StringUtils {

    public static String convertToCamelCase(String value) {
        StringBuilder returnValue = new StringBuilder();
        String throwAwayChars = "()[]{}=?!.:,-_+\\\"#~/";
        value = value.replaceAll("[" + Pattern.quote(throwAwayChars) + "]", " ");
        value = value.toLowerCase();
        boolean makeNextUppercase = true;
        char[] charArray = value.toCharArray();
        for (int i = 0; i < charArray.length; i++) {
            char c = charArray[i];
            if (Character.isSpaceChar(c) || Character.isWhitespace(c)) {
                makeNextUppercase = true;
            } else if (makeNextUppercase) {
                c = Character.toTitleCase(c);
                makeNextUppercase = false;
            }
            if(i == 0) {
                c = Character.toLowerCase(c);
            }
            returnValue.append(c);
        }
        return returnValue.toString().replaceAll("\\s+", "");
    }

    public static boolean isEmpty(String in) {
        return in == null || in.isEmpty();
    }
}
