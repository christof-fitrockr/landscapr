package de.landscapr.server.mail;

import com.sun.mail.imap.IMAPFolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import javax.mail.*;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeBodyPart;
import javax.mail.internet.MimeMessage;
import javax.mail.internet.MimeMultipart;
import java.util.Properties;

@Service
public class MailService {

    private static final Logger LOG = LoggerFactory.getLogger(MailService.class);

    private String mail = "invite@landscapr.de";
    private String pass = "+9?),?9%_5Um2tu";
    private String imap = "imap.strato.de";
    private String smtp = "smtp.strato.de";
    private String folderName = "INBOX";
    private Session session;

    @PostConstruct
    public void init() {
        Properties prop = new Properties();
        prop.put("mail.smtp.auth", true);
        prop.put("mail.smtp.starttls.enable", "true");
        prop.put("mail.smtp.host", smtp);
        prop.put("mail.smtp.port", "25");
        prop.put("mail.smtp.ssl.trust", smtp);
        prop.put("mail.store.protocol", "imaps");
        session = Session.getInstance(prop, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(mail, pass);
            }
        });
    }

    public void sendMail(String addressList, String subject, String plainText) throws MessagingException {
        Message message = new MimeMessage(session);
        message.setFrom(new InternetAddress(mail));
        message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(addressList));
        message.setSubject(subject);

//        MimeBodyPart mimeBodyPart = new MimeBodyPart();
//        mimeBodyPart.setContent(message, "text/plain; charset=utf-8");
//        Multipart multipart = new MimeMultipart();
//        multipart.addBodyPart(mimeBodyPart);
        message.setContent(plainText, "text/plain; charset=utf-8");
        Transport.send(message);
    }

    public void listMessages() throws MessagingException {
        Store store = session.getStore("imaps");
        try {
            store.connect(imap, mail, pass);

            Folder root = store.getDefaultFolder();
            Folder[] folders = root.list();

            for (int i = 0; i < folders.length; i++) {
                LOG.info("Folde: " + folders[i].getName());
            }

            IMAPFolder  folder = (IMAPFolder)store.getFolder(folderName);

            long afterFolderSelectionTime = System.nanoTime();
            int totalNumberOfMessages = 0;
            try {
                if (!folder.isOpen()) {
                    folder.open(Folder.READ_ONLY);
                }

                /*
                 * Now we fetch the message from the IMAP folder in descending order.
                 *
                 * This way the new mails arrive with the first chunks and older mails
                 * afterwards.
                 */
                long largestUid = folder.getUIDNext() - 1;
                int chunkSize = 500;
                for (long offset = 0; offset < largestUid; offset += chunkSize) {
                    long start = Math.max(1, largestUid - offset - chunkSize + 1);
                    long end = Math.max(1, largestUid - offset);

                    /*
                     * The next line fetches the existing messages within the
                     * given range from the server.
                     *
                     * The messages are not loaded entirely and contain hardly
                     * any information. The Message-instances are mostly empty.
                     */
                    long beforeTime = System.nanoTime();
                    Message[] messages = folder.getMessagesByUID(start, end);
                    totalNumberOfMessages += messages.length;
                    System.out.println("found " + messages.length + " messages (took " + (System.nanoTime() - beforeTime) / 1000 / 1000 + " ms)");

                    /*
                     * If we would access e.g. the subject of a message right away
                     * it would be fetched from the IMAP server lazily.
                     *
                     * Fetching the subjects of all messages one by one would
                     * produce many requests to the IMAP server and take too
                     * much time.
                     *
                     * Instead with the following lines we load some information
                     * for all messages with one single request to save some
                     * time here.
                     */
                    beforeTime = System.nanoTime();
                    // this instance could be created outside the loop as well
                    FetchProfile metadataProfile = new FetchProfile();
                    // load flags, such as SEEN (read), ANSWERED, DELETED, ...
                    metadataProfile.add(FetchProfile.Item.FLAGS);
                    // also load From, To, Cc, Bcc, ReplyTo, Subject and Date
                    metadataProfile.add(FetchProfile.Item.ENVELOPE);
                    // we could as well load the entire messages (headers and body, including all "attachments")
                    // metadataProfile.add(IMAPFolder.FetchProfileItem.MESSAGE);
                    folder.fetch(messages, metadataProfile);
                    System.out.println("loaded messages (took " + (System.nanoTime() - beforeTime) / 1000 / 1000 + " ms)");

                    /*
                     * Now that we have all the information we need, let's print some mails.
                     * This should be wicked fast.
                     */
                    beforeTime = System.nanoTime();
                    for (int i = messages.length - 1; i >= 0; i--) {
                        Message message = messages[i];
                        long uid = folder.getUID(message);
                        boolean isRead = message.isSet(Flags.Flag.SEEN);

                        if (!isRead) {
                            // new messages are green
                            System.out.print("\u001B[32m");
                        }
                        System.out.println("\t" + uid + "\t" + message.getSubject());
                        if (!isRead) {
                            // reset color
                            System.out.print("\u001B[0m");
                        }
                    }
                    System.out.println("Listed message (took " + (System.nanoTime() - beforeTime) / 1000 / 1000 + " ms)");
                }
            } finally {
                if (folder.isOpen()) {
                    folder.close(true);
                }
            }

            System.out.println("\nListed all " + totalNumberOfMessages + " messages (took " + (System.nanoTime() - afterFolderSelectionTime) / 1000 / 1000 + " ms)");
        } finally {
            store.close();
        }
    }

}
