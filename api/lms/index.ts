import { Api } from "../../core/utils/abstract.ts";
import { RouteError } from "../../core/utils/route-error.ts";
import { v } from "../../core/utils/validate.ts";
import { AuthMiddleware } from "../auth/middleware/auth.ts";
import { LmsQuery } from "./query.ts";
import { lmsTables } from "./tables.ts";
v;
export class LmsApi extends Api {
  query = new LmsQuery(this.db);
  auth = new AuthMiddleware(this.core);
  handlers = {
    postCourse: (req, res) => {
      const { slug, title, description, lessons, hours } = {
        slug: v.string(req.body.slug),
        title: v.string(req.body.title),
        description: v.string(req.body.title),
        lessons: v.number(req.body.lessons),
        hours: v.number(req.body.hours),
      };
      const writeResult = this.query.insertCourse({
        slug,
        title,
        description,
        lessons,
        hours,
      });
      if (writeResult.changes === 0) {
        throw new RouteError(400, "Erro ao criar curso");
      }
      res.status(201).json({
        id: writeResult.lastInsertRowid,
        changes: writeResult.changes,
        title: "Curso criado",
      });
    },
    postLesson: (req, res) => {
      const {
        courseSlug,
        slug,
        title,
        seconds,
        video,
        description,
        order,
        free,
      } = {
        courseSlug: v.string(req.body.courseSlug),
        slug: v.string(req.body.slug),
        title: v.string(req.body.title),
        seconds: v.number(req.body.seconds),
        video: v.string(req.body.video),
        description: v.string(req.body.description),
        order: v.number(req.body.order),
        free: v.number(req.body.free),
      };
      const writeResult = this.query.insertLesson({
        courseSlug,
        slug,
        title,
        seconds,
        video,
        description,
        order,
        free,
      });
      if (writeResult.changes === 0) {
        throw new RouteError(400, "Erro ao criar Aula");
      }
      res.status(201).json({
        id: writeResult.lastInsertRowid,
        changes: writeResult.changes,
        title: "Aula criado",
      });
    },
    getCourses: (req, res) => {
      const courses = this.query.selectCourses();
      if (courses.length === 0) {
        throw new RouteError(404, "Nenhum curso encontrado");
      }
      res.status(200).json({ courses });
    },
    getCourse: (req, res) => {
      const { slug } = req.params;
      const lessons = this.query.selectLessons(slug);
      const course = this.query.selectCourse(slug);
      if (!course) {
        throw new RouteError(404, "Curso não encontrado");
      }
      let completed: {
        lesson_id: number;
        completed: string;
      }[] = [];
      if (req.session) {
        completed = this.query.selectLessonsCompleted(
          req.session.user_id,
          course.id,
        );
      }
      res.status(200).json({ course, lessons, completed });
    },
    getLesson: (req, res) => {
      const { courseSlug, lessonSlug } = req.params;
      const lesson = this.query.selectLesson(courseSlug, lessonSlug);
      const nav = this.query.selectLessonNav(courseSlug, lessonSlug);
      if (!lesson) {
        throw new RouteError(404, "Aula não encontrada");
      }

      const i = nav.findIndex((l) => l.slug === lesson.slug);
      const prev = i === 0 ? null : nav.at(i - 1)?.slug;
      const next = nav.at(i + 1)?.slug ?? null;

      const userId = 1;
      let completed = "";
      if (userId) {
        const lessonCompleted = this.query.selectLessonCompleted(
          userId,
          lesson.id,
        );
        if (lessonCompleted) completed = lessonCompleted.completed;
      }

      res.status(200).json({ ...lesson, prev, next, completed });
    },
    completeLesson: (req, res) => {
      try {
        const userId = 1;
        const { courseId, lessonId } = {
          courseId: v.number(req.body.courseId),
          lessonId: v.number(req.body.lessonId),
        };

        const writeResult = this.query.insertLessonCompleted(
          userId,
          courseId,
          lessonId,
        );

        if (writeResult.changes === 0) {
          throw new RouteError(400, "Erro ao completar aula");
        }

        const progress = this.query.selectProgress(userId, courseId);
        const incompleteLessons = progress.filter((l) => !l.completed);
        console.log(incompleteLessons.length);

        if (progress.length > 0 && incompleteLessons.length === 0) {
          const certificate = this.query.insertCertificate(userId, courseId);
          if (!certificate) {
            throw new RouteError(400, "Falha ao criar certificado");
          }
          res.status(201).json({
            certificate: certificate.id,
            title: "Aula concluída",
          });
          return;
        }

        res.status(201).json({
          title: "Aula concluída",
        });
      } catch (error) {
        res.status(400).json({
          title: "Aula não encontrada",
        });
      }
    },
    reseteCourse: (req, res) => {
      const userId = 1;
      const { courseId } = { courseId: v.number(req.body.courseId) };

      const writeResult = this.query.deleteLessonsCompleted(userId, courseId);

      if (writeResult.changes === 0) {
        throw new RouteError(400, "Erro ao resetar curso");
      }
      res.status(200).json({
        title: "Curso resetado",
      });
    },
    getCertificates: (req, res) => {
      const userId = 1;
      const certificates = this.query.selectCertificates(userId);

      if (certificates.length === 0) {
        throw new RouteError(400, "Nenhum certificado encotrado");
      }
      res.status(200).json(certificates);
    },
    getCertificate: (req, res) => {
      const { id } = req.params;
      const certificate = this.query.selectCertificate(id);
      if (!certificate) {
        throw new RouteError(400, "Certificado não encontrado");
      }

      res.status(200).json(certificate);
    },
  } satisfies Api["handlers"];
  tables() {
    this.db.exec(lmsTables);
  }

  routes(): void {
    this.router.post("/lms/course", this.handlers.postCourse);
    this.router.get("/lms/courses", this.handlers.getCourses);
    this.router.get("/lms/course/:slug", this.handlers.getCourse, [
      this.auth.optional,
    ]);
    this.router.delete("/lms/course/reset", this.handlers.reseteCourse);
    this.router.post("/lms/lesson", this.handlers.postLesson);
    this.router.get(
      "/lms/lesson/:courseSlug/:lessonSlug",
      this.handlers.getLesson,
    );
    this.router.post("/lms/lesson/complete", this.handlers.completeLesson);
    this.router.get("/lms/certificates", this.handlers.getCertificates);
    this.router.get("/lms/certificate/:id", this.handlers.getCertificate);
  }
}
