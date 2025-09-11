package pdf.archi_web.Controllers;


import lombok.Getter;
import lombok.Setter;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import pdf.archi_web.services.StreamingService;

@Controller
public class SearchWebSocketController {

    private final StreamingService streamingService;

    public SearchWebSocketController(StreamingService streamingService) {
        this.streamingService = streamingService;
    }

    @MessageMapping("/startSearch")
    public void startSearch(@Payload SearchRequest request, SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        System.out.println("Recherche démarrée pour la session: " + sessionId + " query=" + request.getQuery());
        String user = (request.getUser() == null || request.getUser().isBlank()) ? "Maxime" : request.getUser();
        streamingService.streamResultsForUser(request.getSessionId(), request.getQuery(), user);
    }


    @Setter @Getter
    public static class SearchRequest {
        private String query;
        private String sessionId; // client hint (non utilisé pour router)
        private String user = "Maxime";
    }

}
