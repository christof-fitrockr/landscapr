package de.landscapr.server.security;

import de.landscapr.server.authentication.Account;
import de.landscapr.server.authentication.AccountRepository;
import io.jsonwebtoken.JwtException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class JwtAuthenticationProvider implements AuthenticationProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationProvider.class);

    private final JwtTokenService jwtService;



    @Autowired
    public JwtAuthenticationProvider(JwtTokenService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public Authentication authenticate(Authentication authentication) throws AuthenticationException {

        try {
            String token = (String) authentication.getCredentials();
            Optional<Account> account = jwtService.getAccountFromToken(token);

            if(account.isPresent()) {
                return jwtService.validateToken(token)
                        .map(aBoolean -> new JwtAuthenticatedProfile(account.get()))
                        .orElseThrow(() -> new JwtAuthenticationException("JWT Token validation failed"));
            }
            throw new JwtAuthenticationException("User not found.");

        } catch (JwtException ex) {
            log.error(String.format("Invalid JWT Token: %s", ex.getMessage()));
            throw new JwtAuthenticationException("Failed to verify token");
        }
    }

    @Override
    public boolean supports(Class<?> authentication) {
        return JwtAuthentication.class.equals(authentication);
    }
}
