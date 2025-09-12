// src/main/java/pdf/archi_web/services/AuditLogService.java
package pdf.archi_web.services;

import org.springframework.stereotype.Service;
import pdf.archi_web.DTO.SearchResult;

import java.nio.file.*;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class AuditLogService {

    private static final ZoneId PARIS = ZoneId.of("Europe/Paris");
    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ssXXX");
    private static final Path LOG_DIR = Path.of("logs");
    private static final Path LOG_FILE = LOG_DIR.resolve("audit.log");

    public AuditLogService() {
        try {
            Files.createDirectories(LOG_DIR);
            if (!Files.exists(LOG_FILE)) {
                Files.createFile(LOG_FILE);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /* ----------------- Upload ----------------- */

    public void logUploadOk(String user, String filename, long sizeBytes) {
        // compat rétro: appelle la version enrichie sans URL
        logUploadOk(user, filename, sizeBytes, null);
    }

    public void logUploadOk(String user, String filename, long sizeBytes, String url) {
        String line = formatBase("UPLOAD", user, "OK")
                + " | fichier=" + (filename == null ? "" : filename)
                + " | taille=" + sizeBytes + " octets"
                + (url == null ? "" : " | url=" + safe(url));
        write(line);
    }

    public void logUploadError(String user, String filename, String error) {
        String line = formatBase("UPLOAD", user, "ERROR")
                + " | fichier=" + (filename == null ? "" : filename)
                + " | erreur=" + safe(error);
        write(line);
    }

    /* ----------------- Search ----------------- */

    public void logSearchOk(String user, String query, List<SearchResult> results) {
        int n = (results == null) ? 0 : results.size();
        String line = formatBase("SEARCH", user, "OK")
                + " | query=\"" + safe(query) + "\""
                + " | occurrences=" + n;
        write(line);
    }

    public void logSearchError(String user, String query, String error) {
        String line = formatBase("SEARCH", user, "ERROR")
                + " | query=\"" + safe(query) + "\""
                + " | erreur=" + safe(error);
        write(line);
    }

    /* ----------------- Helpers ----------------- */

    private String formatBase(String action, String user, String status) {
        return ZonedDateTime.now(PARIS).format(TS)
                + " | user=" + (user == null ? "Maxime" : user)
                + " | action=" + action
                + " | status=" + status;
    }

    private void write(String line) {
        try {
            Files.writeString(LOG_FILE, line + System.lineSeparator(),
                    StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static String safe(String s) {
        return s == null ? "" : s.replace("\n", " ").replace("\r", " ");
    }
}
