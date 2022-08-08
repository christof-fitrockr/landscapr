package de.landscapr.server.authentication;

import de.landscapr.server.exception.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.annotation.security.RolesAllowed;
import javax.mail.MessagingException;
import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

@RestController
@RequestMapping
public class AccountController {

    private final AccountService accountService;
    private final AccountRepository accountRepository;

    @Autowired
    public AccountController(AccountService accountService, AccountRepository accountRepository) {
        this.accountService = accountService;
        this.accountRepository = accountRepository;
    }

    @PostMapping("/api/authenticate")
    public ResponseEntity<AuthenticationResponse> authenticate(@RequestBody AuthenticationRequest request) {
        return new ResponseEntity<>(accountService.generateJWTToken(request.getEmail(), request.getPassword()), HttpStatus.OK);
    }

    @RolesAllowed({Role.Code.ADMIN })
    @RequestMapping(method = RequestMethod.GET, value = "/api/account/all")
    public ResponseEntity<List<Account>> all() {
        return ResponseEntity.ok(accountRepository.findAll());
    }

    @RolesAllowed({Role.Code.ADMIN })
    @RequestMapping(method = RequestMethod.GET, value = "/api/account/byId/{systemId}")
    public ResponseEntity<Account> get(@PathVariable String systemId) {
        return accountRepository.findById(systemId).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @RolesAllowed({Role.Code.ADMIN })
    @RequestMapping(method = RequestMethod.GET, value = "/api/account/delete/{accountId}")
    public ResponseEntity<Void> delete(@PathVariable String accountId) {
        accountRepository.findById(accountId).ifPresent(accountRepository::delete);
        return ResponseEntity.ok().build();
    }

    @RolesAllowed({Role.Code.ADMIN })
    @RequestMapping(method = RequestMethod.POST, value = "/api/account/invite", produces = APPLICATION_JSON_VALUE, consumes = APPLICATION_JSON_VALUE)
    public ResponseEntity<Account> invite(@RequestBody Account account) throws MessagingException {
        return ResponseEntity.ok(accountService.invite(account));
    }

    @RolesAllowed({Role.Code.ADMIN })
    @RequestMapping(method = RequestMethod.POST, value = "/api/account/update", produces = APPLICATION_JSON_VALUE, consumes = APPLICATION_JSON_VALUE)
    public ResponseEntity<Account> update(@RequestBody Account account) {
        return ResponseEntity.ok(accountRepository.save(account));
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<String> handleEntityNotFoundException(EntityNotFoundException ex) {
        return new ResponseEntity<>(ex.getMessage(), HttpStatus.NOT_FOUND);
    }
}
