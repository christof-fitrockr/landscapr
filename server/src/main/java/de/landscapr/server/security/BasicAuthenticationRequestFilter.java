package de.landscapr.server.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.CorsUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collection;

@Component
public class BasicAuthenticationRequestFilter extends OncePerRequestFilter {

    private static final Logger LOG = LoggerFactory.getLogger(BasicAuthenticationRequestFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        String requestTokenHeader = request.getHeader("Authorization");


        String requestURI = request.getRequestURI();
        if (!CorsUtils.isPreFlightRequest(request) && requestURI.startsWith("/actuator/")) {


            if (requestTokenHeader == null || !requestTokenHeader.startsWith("Basic ")) {
                generateCorsHeader(response);
                response.sendError(HttpServletResponse.SC_FORBIDDEN, "Access to actuator is forbidden.");
                return;
            } else {
                String[] split = getCredentials(requestTokenHeader);
                String username = split[0];
                String password = split[1];

                if(!"FITROCKR_METRICS".equals(username) || !password.equals("f1tr0ckrM3tr1x!")) {
                    generateCorsHeader(response);
                    response.sendError(HttpServletResponse.SC_FORBIDDEN, "Access to actuator is forbidden.");
                    return;
                }
            }
        }

        chain.doFilter(request, response);
    }


    private String[] getCredentials(String requestTokenHeader) {
        String header = requestTokenHeader.substring("Basic ".length());
        header = new String(Base64.getDecoder().decode(header));
        return header.split(":");
    }


    private void generateCorsHeader(HttpServletResponse response) {
        //if(configService.isDev()) {
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE");
        response.setHeader("Access-Control-Max-Age", "3600");
        response.setHeader("Access-Control-Allow-Credentials", "true");
        response.setHeader("Access-Control-Allow-Headers", "Origin,Accept,X-Requested-With,Content-Type,Access-Control-Request-Method,Access-Control-Request-Headers,Authorization");

        //}
    }


    private void createAndAuthenticateUserDetailsForRole(HttpServletRequest request, String role) {
        UserDetails userDetails = new UserDetails() {
                        @Override
                        public Collection<? extends GrantedAuthority> getAuthorities() {
                            return Arrays.asList((GrantedAuthority) () -> "ROLE_" + role);
                        }

                        @Override
                        public String getPassword() {
                            return "///";
                        }

                        @Override
                        public String getUsername() {
                            return "__" + role + "__";
                        }

                        @Override
                        public boolean isAccountNonExpired() {
                            return true;
                        }

                        @Override
                        public boolean isAccountNonLocked() {
                            return true;
                        }

                        @Override
                        public boolean isCredentialsNonExpired() {
                            return true;
                        }

                        @Override
                        public boolean isEnabled() {
                            return true;
                        }
                    };
        UsernamePasswordAuthenticationToken usernamePasswordAuthenticationToken = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        usernamePasswordAuthenticationToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

        SecurityContextHolder.getContext().setAuthentication(usernamePasswordAuthenticationToken);
    }
}
