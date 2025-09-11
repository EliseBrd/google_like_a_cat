package pdf.archi_web.services;

import lombok.RequiredArgsConstructor;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.flyway.FlywayProperties;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import pdf.archi_web.PdfSearcher;
import pdf.archi_web.DTO.SearchResult;

@Service
@RequiredArgsConstructor
public class StreamingService {

    private final SimpMessagingTemplate messagingTemplate;
    private final AuditLogService audit;

    public void streamResultsForUser(String sessionId, String query) {
        streamResultsForUser(sessionId, query, "Maxime");
    }

    public void streamResultsForUser(String sessionId, String query, String user) {
        List<SearchResult> all = new ArrayList<>();
        try {
            PdfSearcher searcher = new PdfSearcher("index");
            searcher.search(query, result -> {
                // push WS
                messagingTemplate.convertAndSend("/queue/results-" + sessionId, result);
                // garde pour le log final
                all.add(result);
            });

            // (optionnel) notifier la fin :
            messagingTemplate.convertAndSend("/queue/results-" + sessionId, "COMPLETED");

            // log complet
            audit.logSearchOk(user, query, all);

        } catch (Exception e) {
            audit.logSearchError(user, query, e.getMessage());
            messagingTemplate.convertAndSend("/queue/results-" + sessionId, "ERROR: " + e.getMessage());
        }
    }
}
