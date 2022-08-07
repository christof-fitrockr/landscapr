package de.landscapr.server.authentication;

import de.landscapr.server.exception.EntityNotFoundException;
import de.landscapr.server.security.JwtTokenService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;

@Service
public class AuthenticationService {

    private final AccountRepository accountRepository;
    private final JwtTokenService jwtTokenService;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public AuthenticationService(AccountRepository accountRepository, JwtTokenService jwtTokenService, PasswordEncoder passwordEncoder) {
        this.accountRepository = accountRepository;
        this.jwtTokenService = jwtTokenService;
        this.passwordEncoder = passwordEncoder;
    }

    public AuthenticationResponse generateJWTToken(String email, String password) {
        Optional<Account> dbAccount = accountRepository.findByEmail(email);
        return dbAccount
                .filter(account ->  passwordEncoder.matches(password, account.getPassword()))
                .map(account -> new AuthenticationResponse(jwtTokenService.generateToken(email)))
                .orElseThrow(() ->  new EntityNotFoundException("Account not found"));
    }

    public List<Account> allAccounts() {
        return accountRepository.findAll();
    }



    @PostConstruct
    public void init() {

        Optional<Account> account = accountRepository.findByEmail("support@landscapr.de");
        if(!account.isPresent()) {
            Account adminAccount = new Account();
            adminAccount.setFirstname("Support");
            adminAccount.setLastname("Landscapr");
            adminAccount.setEmail("support@landscapr.de");
            adminAccount.setPassword(AuthenticationService.hashPassword("landscapr4digitalR€belz"));
            accountRepository.save(adminAccount);
        }

    }


    public static String hashPassword(String password) {
        return BCrypt.hashpw(password, BCrypt.gensalt());
    }
}
