package de.landscapr.server.authentication;

import org.springframework.security.core.GrantedAuthority;

public enum Role implements GrantedAuthority {

    Admin(Code.ADMIN),
    Editor(Code.EDITOR),
    Reader(Code.READER);

    private final String authority;

    Role(String authority) {
        this.authority = authority;
    }

    @Override
    public String getAuthority() {
        return authority;
    }

    public boolean is(Account user) {
        return user.getRoles() != null && user.getRoles().contains(this);
    }

    public static boolean is(Account user, Role role) {
        return role.is(user);
    }

    public class Code {
        public static final String READER = "ROLE_READER";
        public static final String EDITOR = "ROLE_EDITOR";
        public static final String ADMIN = "ROLE_ADMIN";
    }
}
