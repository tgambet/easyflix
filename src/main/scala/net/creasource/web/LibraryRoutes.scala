package net.creasource.web

import akka.http.scaladsl.model._
import akka.http.scaladsl.model.headers.{Range, RangeUnits}
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.server.directives.RouteDirectives.complete
import akka.http.scaladsl.server.directives.{ContentTypeResolver, FileAndResourceDirectives}
import akka.pattern.ask
import net.creasource.core.Application
import net.creasource.model.{Folder, LibraryFile, Video}
import net.creasource.web.LibraryActor.GetLibraryFile
import net.creasource.web.MediaTypesActor.{GetContentTypeResolver, GetMediaTypes}

import scala.concurrent.duration._

object LibraryRoutes extends FileAndResourceDirectives {

  implicit val askTimeout: akka.util.Timeout = 2.seconds

  def routes(application: Application): Route =
    pathPrefix("videos") {
      Route.seal(
        path(Segment) { id =>
          onSuccess((application.libraryActor ? GetLibraryFile(id)).mapTo[Option[LibraryFile]]) {
            case Some(Video(_, _, _, _, path)) =>
              onSuccess((application.mediaTypesActor ? GetContentTypeResolver).mapTo[ContentTypeResolver]) { implicit contentTypeResolver =>
                // https://bugzilla.mozilla.org/show_bug.cgi?id=1422891
                optionalHeaderValueByType[Range](()) {
                  case Some(Range(RangeUnits.Bytes, Seq(range))) => Routes.getFromFileWithRange(path.toFile, range)
                  case _ => getFromFile(path.toFile)
                }
              }
            case Some (Folder(_, _, _, _)) =>
              // getFromBrowseableDirectory()
              complete(StatusCodes.NotAcceptable, "Requested id does not match any video file")
            case _ =>
              complete(StatusCodes.NotFound, "The requested resource could not be found")
          }
        }
      )
    }

}
