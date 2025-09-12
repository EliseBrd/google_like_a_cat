// src/main/java/pdf/archi_web/warmup/SearchWarmup.java
package pdf.archi_web;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import pdf.archi_web.PdfSearcher;
import pdf.archi_web.DTO.SearchResult;
//import pdf.archi_web.SearchCache;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

@Component
public class SearchWarmup {

    @Value("${index.dir:index}") 
    private String indexDir;

    // private final SearchCache searchCache;

    // public SearchWarmup(SearchCache searchCache) {
    //     this.searchCache = searchCache;
    // }

    @EventListener(ApplicationReadyEvent.class)
    public void warmOnStartup() {
        // ne pas bloquer le démarrage
        CompletableFuture.runAsync(() -> {
            try {
                System.out.println("[Warmup] starting…");
                PdfSearcher s = new PdfSearcher(indexDir);

                // 1) première requête “no-op” pour ouvrir le reader/analyzer/JIT
                s.search("warmup", r -> { /* noop */ });

                // 2) requêtes représentatives pour peupler caches Lucene + Caffeine
                List<String> hotQueries = List.of("contrat", "lot", "avenant"); // adapte à ton domaine
                for (String q : hotQueries) {
                    List<SearchResult> tmp = new ArrayList<>();
                    s.search(q, tmp::add);
              //      searchCache.put(q, tmp); // optionnel: pré-remplit ton cache applicatif
                }

                System.out.println("[Warmup] done.");
            } catch (Exception e) {
                System.err.println("[Warmup] failed: " + e.getMessage());
            }
        });
    }
}
