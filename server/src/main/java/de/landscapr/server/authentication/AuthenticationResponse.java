package de.landscapr.server.authentication;

public class AuthenticationResponse {

    private boolean success;
    private String code;
    private String token;
    private boolean admin;
    private boolean editor;

    public static AuthenticationResponse ok(String token, boolean admin, boolean editor) {
        AuthenticationResponse response = new AuthenticationResponse();
        response.setToken(token);
        response.setSuccess(true);
        response.setAdmin(admin);
        response.setEditor(editor);
        response.setCode("success");
        return response;
    }

    public static AuthenticationResponse accountNotFound() {
        AuthenticationResponse response = new AuthenticationResponse();
        response.setSuccess(false);
        response.setAdmin(false);
        response.setCode("login-failed");
        return response;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public boolean isSuccess() {
        return success;
    }

    public AuthenticationResponse setSuccess(boolean success) {
        this.success = success;
        return this;
    }

    public String getCode() {
        return code;
    }

    public AuthenticationResponse setCode(String code) {
        this.code = code;
        return this;
    }

    public boolean isAdmin() {
        return admin;
    }

    public AuthenticationResponse setAdmin(boolean admin) {
        this.admin = admin;
        return this;
    }

    public boolean isEditor() {
        return editor;
    }

    public AuthenticationResponse setEditor(boolean editor) {
        this.editor = editor;
        return this;
    }
}
