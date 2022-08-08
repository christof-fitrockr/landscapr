package de.landscapr.server.authentication;

import de.landscapr.server.RandomString;
import de.landscapr.server.mail.MailService;
import de.landscapr.server.security.JwtTokenService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import javax.mail.MessagingException;
import java.util.*;

@Service
public class AccountService {


    @Value("${baseUrl}")
    private String baseUrl;


    private final AccountRepository accountRepository;
    private final JwtTokenService jwtTokenService;
    private final MailService mailService;
    private final RandomString randomString = new RandomString(8);//, new Random(), "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!?%");

    @Autowired
    public AccountService(AccountRepository accountRepository, JwtTokenService jwtTokenService, MailService mailService) {
        this.accountRepository = accountRepository;
        this.jwtTokenService = jwtTokenService;
        this.mailService = mailService;
    }

    public AuthenticationResponse generateJWTToken(String email, String password) {
        Optional<Account> dbAccount = accountRepository.findByEmail(email);
        return dbAccount
                .filter(account ->  BCrypt.hashpw(password, account.getPassword()).equals(account.getPassword()))
                .map(account -> AuthenticationResponse.ok(jwtTokenService.generateToken(email),
                        account.getRoles().contains(Role.Admin),
                        account.getRoles().contains(Role.Editor)))
                .orElse(AuthenticationResponse.accountNotFound());
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
            adminAccount.setRoles(Collections.singleton(Role.Admin));
            adminAccount.setPassword(AccountService.hashPassword("landscapr4digitalR€belz"));
            accountRepository.save(adminAccount);
        }
    }

    public static String hashPassword(String password) {
        return BCrypt.hashpw(password, BCrypt.gensalt());
    }

    public Account invite(Account account) throws MessagingException {

        String password = randomString.nextString();
        account.setPassword(AccountService.hashPassword(randomString.nextString()));

        Account savedAccount = accountRepository.save(account);

        StringBuilder message = new StringBuilder();
        message.append("Hi,");
        message.append("you are invited to join Landscapr. To log-in, please use the following credentials").append('\n');
        message.append("-Url: ").append(baseUrl).append('\n');
        message.append("-Email: ").append(account.getEmail()).append('\n');
        message.append("-Password: ").append(password).append('\n');
        message.append("Regards").append('\n');
        message.append(" Landscapr-Team").append('\n');


        mailService.sendMail(account.getEmail(), "Landscapr Invite", message.toString());
        return savedAccount;
    }


}
