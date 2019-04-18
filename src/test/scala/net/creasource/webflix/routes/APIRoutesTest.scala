package net.creasource.webflix.routes

import akka.http.scaladsl.model.MediaType.NotCompressible
import akka.http.scaladsl.model.{MediaType, StatusCodes}
import akka.http.scaladsl.testkit._
import net.creasource.Application
import net.creasource.json.JsonSupport
import net.creasource.util.WithLibrary
import net.creasource.webflix.actors.MediaTypesActor
import net.creasource.webflix.actors.MediaTypesActor.AddMediaTypeError
import net.creasource.webflix.{Library, LibraryFile}
import org.scalatest.{Matchers, WordSpecLike}
import spray.json._

class APIRoutesTest
  extends WordSpecLike
    with Matchers
    with WithLibrary
    with ScalatestRouteTest
    with JsonSupport {

  val application = Application()

  override def afterAll(): Unit = {
    application.shutdown()
    super.afterAll()
  }

  "API routes (libraries)" should {

    val route = APIRoutes.routes(application)

    val lib = Library.Local("name", libraryPath)

    "return an empty array for GETs on /libraries" in {
      Get("/libraries") ~> route ~> check {
        status shouldEqual StatusCodes.OK
        responseAs[Seq[Library]] shouldEqual Seq.empty
      }
    }

    "return a library for POSTs on /libraries" in {
      Post("/libraries", lib.toJson) ~> route ~> check {
        status shouldEqual StatusCodes.OK
        responseAs[Library] shouldEqual lib
      }
    }

    "return a BadRequest for consecutive POSTs on /libraries" in {
      Post("/libraries", lib.toJson) ~> route ~> check {
        status shouldEqual StatusCodes.BadRequest
        responseAs[JsValue] shouldEqual JsObject(
          "control" -> "name".toJson,
          "code" -> "alreadyExists".toJson,
          "value" -> JsNull
        )
      }
    }

    "return created libraries for GETs on /libraries" in {
      Get("/libraries") ~> route ~> check {
        status shouldEqual StatusCodes.OK
        responseAs[Seq[Library]] shouldEqual Seq(lib)
      }
    }

    "return an object for GETs on /library/{name}" in {
      Get(s"/libraries/${lib.name}") ~> route ~> check {
        status shouldEqual StatusCodes.OK
        responseAs[JsObject] shouldEqual JsObject(
          "library" -> lib.toJson,
          "files" -> JsArray()
        )
      }
    }

    "return a 404 for GETs on /library/unknown" in {
      Get(s"/libraries/unknown") ~> route ~> check {
        status shouldEqual StatusCodes.NotFound
        responseAs[JsValue] shouldEqual JsString("No library with that name")
      }
    }

    "return files for POSTs on /library/{name}/scan" in {
      Post(s"/libraries/${lib.name}/scan") ~> route ~> check {
        status shouldEqual StatusCodes.OK
        responseAs[Seq[LibraryFile]].length shouldEqual libraryFiles.length + 1
      }
    }

    "return a 404 for POSTs on /library/unknown/scan" in {
      Post(s"/libraries/unknown/scan") ~> route ~> check {
        status shouldEqual StatusCodes.NotFound
        responseAs[JsValue] shouldEqual JsString("No library with that name")
      }
    }

    "return an Accepted status for DELETEs on /library/{name}" in {
      Delete(s"/libraries/${lib.name}") ~> route ~> check {
        status shouldEqual StatusCodes.Accepted
        responseAs[String] shouldEqual ""
      }
    }

    "return an empty array for GETs on /libraries (2)" in {
      Thread.sleep(100) // Remove this test ?
      Get("/libraries") ~> route ~> check {
        status shouldEqual StatusCodes.OK
        responseAs[Seq[Library]] shouldEqual Seq.empty
      }
    }

  }

  "API routes (media-types)" should {

    val route = APIRoutes.routes(application)

    "return default media-types for GETs on /media-types" in {
      Get("/media-types") ~> route ~> check {
        status shouldEqual StatusCodes.OK
        responseAs[Seq[MediaType.Binary]] shouldEqual Seq(MediaTypesActor.`video/x-mastroka`)
      }
    }

    "return a custom media-type for POSTs on /media-types" in {
      val custom = MediaType.video("x-custom", NotCompressible, "custom")
      Post("/media-types", custom) ~> route ~> check {
        status shouldEqual StatusCodes.OK
        responseAs[MediaType.Binary] shouldEqual custom
      }
    }

    "return a BadRequest for POSTs on /media-types for existing media-types" in {
      val custom = MediaType.video("x-custom", NotCompressible, "custom")
      Post("/media-types", custom) ~> route ~> check {
        status shouldEqual StatusCodes.BadRequest
        responseAs[AddMediaTypeError] shouldEqual AddMediaTypeError("contentType", "alreadyExists")
      }
    }

    "return an empty OK response for DELETEs on /media-types" in {
      val custom = MediaType.video("x-custom", NotCompressible, "custom")
      Delete(s"/media-types/${custom.subType}") ~> route ~> check {
        status shouldEqual StatusCodes.OK
        responseAs[String] shouldEqual ""
      }
    }

  }

}
