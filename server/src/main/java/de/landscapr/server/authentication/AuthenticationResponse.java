package de.landscapr.server.authentication;

public class AuthenticationResponse {

    private boolean success;
    private String code;
    private String token;

    public static AuthenticationResponse ok(String token) {
        AuthenticationResponse response = new AuthenticationResponse();
        response.setToken(token);
        response.setSuccess(true);
        response.setCode("success");
        return response;
    }

    public static AuthenticationResponse accountNotFound() {
        AuthenticationResponse response = new AuthenticationResponse();
        response.setSuccess(false);
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
}
