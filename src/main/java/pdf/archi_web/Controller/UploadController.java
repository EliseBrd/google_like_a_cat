// src/main/java/pdf/archi_web/Controller/UploadController.java
package pdf.archi_web.Controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pdf.archi_web.Service.UploadService;
import pdf.archi_web.services.AuditLogService;

@RestController
@RequestMapping("/api/upload")
public class UploadController {

    private final UploadService uploadService;
    private final AuditLogService audit;

    public UploadController(UploadService uploadService, AuditLogService audit) {
        this.uploadService = uploadService;
        this.audit = audit;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file,
                                    @RequestParam(value = "user", defaultValue = "Maxime") String user) {
        String filename = file != null ? file.getOriginalFilename() : null;
        try {
            var res = uploadService.storeAndIndex(file);
            audit.logUploadOk(user, res.getFilename(), file.getSize());
            return ResponseEntity.ok(res);
        } catch (IllegalArgumentException iae) {
            audit.logUploadError(user, filename, iae.getMessage());
            return ResponseEntity.badRequest().body(iae.getMessage());
        } catch (Exception e) {
            audit.logUploadError(user, filename, e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Erreur upload/indexation : " + e.getMessage());
        }
    }
}
