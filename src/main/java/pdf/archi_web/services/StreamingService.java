package pdf.archi_web.services;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.flyway.FlywayProperties;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import pdf.archi_web.PdfSearcher;

@Service
@RequiredArgsConstructor
public class StreamingService {

    @Autowired
    private final SimpMessagingTemplate messagingTemplate;

    public void streamResultsForUser(String sessionId, String query) {
        try {
            PdfSearcher searcher = new PdfSearcher("index"); // réutilise ton index existant
            searcher.search(query, result -> {
                // Envoi du résultat uniquement à cet utilisateur
                messagingTemplate.convertAndSend("/queue/results-" + sessionId, result);
            });
            // Signal que la recherche est terminée
            //messagingTemplate.convertAndSend("/queue/results-" + sessionId, "COMPLETED");

        } catch (Exception e) {
            messagingTemplate.convertAndSendToUser(sessionId, "/queue/results",
                    "ERROR: " + e.getMessage());
        }
    }
}
