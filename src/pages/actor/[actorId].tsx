import React, { useEffect, useState } from "react";
import Layout from "~/components/layout";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { getActorImgUrl, getMovieImgUrl } from "~/modules/tmdb";
import { Actor, Movie } from "@prisma/client";
import { forceSerialize } from "~/lib/forceSerialize";
import { Card } from "~/components/card";
import prisma from "~/lib/prisma";
import dynamic from "next/dynamic";
import { ResponsiveTreeMap } from "@nivo/treemap";
import { ResponsiveLine } from "@nivo/line";

const Network = dynamic(() => import("~/components/network"), { ssr: false });

interface Props {
  data: {
    movieImgUrls: {
      imgUrl: string;
      id: string;
    }[];
    actorImgurl: string;
    id: string;
    jfdbId: string;
    name: string;
    Movie: (Movie & {
      Actor: Actor[];
    })[];
  };
}

const ActorDetails = ({ data }: Props) => {
  const [selected, setSelected] = useState([]);

  const actorImgUrl = data.actorImgurl;
  const actorName = data.name;
  const actorId = data.id;
  const movieImgUrls = data.movieImgUrls;
  const movies: {
    [id: string]: Movie & {
      Actor: Actor[];
    };
  } = {};
  data.Movie.forEach((movie) => {
    movies[movie.id] = movie;
  });
  const wrapperStyle = {
    height: "600px",
  };
  const yearSet = new Set();
  data.Movie.forEach((movie) => {
    const year = (movie.releaseDate as any).slice(0, 4);
    yearSet.add(year);
  });
  const years = Array.from(yearSet);
  const treeMapData = {
    title: "movies",
    children: years.map((year) => {
      return {
        title: year,
        children: data.Movie.filter(
          (movie) => (movie.releaseDate as any).slice(0, 4) === year
        ).map((movie) => {
          return {
            title: movie.title,
            count: 1,
          };
        }),
      };
    }),
  };

  const lineData = [
    {
      id: actorName,
      data: years.map((year) => {
        return {
          x: year as string,
          y: data.Movie.filter(
            (movie) => (movie.releaseDate as any).slice(0, 4) === year
          ).length,
        };
      }),
    },
  ];

  const nodeIds = [];
  const nodes = [];
  data.Movie.forEach((movie) => {
    movie.Actor.forEach((actor) => {
      if (!nodeIds.includes(actor.id) && actor.id !== actorId) {
        nodeIds.push(actor.id);
        nodes.push({ id: actor.id, name: actor.name });
      }
    });
  });

  const compare = (a, b) => a.id.localeCompare(b.id);
  nodes.sort(compare);

  const sourceTarget = {};
  data.Movie.forEach((movie) => {
    const sortedActors = Array.from(movie.Actor).sort(compare);
    sortedActors.forEach((source, index) => {
      if (source.id !== actorId) {
        const targets = [];
        sortedActors.slice(index).forEach((target) => {
          if (source.id !== target.id && target.id !== actorId) {
            targets.push(target.id);
          }
        });
        sourceTarget[source.id] = {};
        targets.forEach((target) => {
          sourceTarget[source.id][target] =
            (sourceTarget[source.id][target] || 0) + 1;
        });
      }
    });
  });

  const links = [];
  for (const source in sourceTarget) {
    for (const target in sourceTarget[source]) {
      links.push({ source, target, weight: sourceTarget[source][target] });
    }
  }

  const initialNetwork = { nodes, links };

  const handleSelect = (node) => {
    const nodeId = node.id;
    setSelected((prev) => {
      const index = prev.indexOf(nodeId);
      const selectedNodeIds = [...prev];
      if (index < 0) {
        selectedNodeIds.push(nodeId);
      } else {
        selectedNodeIds.splice(index, 1);
      }
      return selectedNodeIds;
    });
  };

  return (
    <Layout>
      {data && (
        <main className="section">
          <div className="columns">
            <div className="column is-3">
              <img width="300px" height="450px" src={actorImgUrl} />
            </div>
            <div
              className="column"
              // className="column is-flex is-align-items-center"
            >
              <div>
                <h1 className="title">{actorName}</h1>
              </div>
              <div style={wrapperStyle}>
                <ResponsiveTreeMap
                  data={treeMapData}
                  identity="title"
                  value="count"
                  label={"id"}
                  margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                  labelSkipSize={0}
                  colors={{ scheme: "paired" }}
                  labelTextColor={{
                    from: "color",
                    modifiers: [["darker", 3]],
                  }}
                  parentLabelSize={40}
                  parentLabelTextColor={{
                    from: "color",
                    modifiers: [["darker", 2]],
                  }}
                  borderColor={{ from: "color", modifiers: [["darker", 0.1]] }}
                />
              </div>
              <div style={{ height: "300px" }}>
                <ResponsiveLine
                  data={lineData}
                  margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
                  xScale={{ type: "point" }}
                  yScale={{
                    type: "linear",
                    min: "auto",
                    max: "auto",
                    stacked: true,
                    reverse: false,
                  }}
                  axisRight={null}
                  lineWidth={5}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legendOffset: 36,
                    legendPosition: "middle",
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legendOffset: -40,
                    legendPosition: "middle",
                  }}
                  pointSize={10}
                  pointColor={{ theme: "background" }}
                  pointBorderWidth={2}
                  pointBorderColor={{ from: "serieColor" }}
                  pointLabelYOffset={-12}
                  useMesh={true}
                  colors={{ scheme: "paired" }}
                />
              </div>
            </div>
          </div>

          <div className="columns">
            <div
              className="ml-2 column is-7 has-background-"
              style={{ height: "1000px" }}
            >
              <Network
                initialNetwork={initialNetwork}
                selected={selected}
                handleSelect={handleSelect}
              />
            </div>

            <div className="column">
              <div className="columns is-multiline">
                {movieImgUrls.map(({ id, imgUrl }) => {
                  if (
                    selected.length === 0 ||
                    selected.every((selectedId) =>
                      movies[id].Actor.map((actor) => actor.id).includes(
                        selectedId
                      )
                    )
                    // movies[id].Actor.map((actor) => actor.id).every((id) =>
                    //   selected.includes(id)
                    // )
                  ) {
                    return (
                      <Link href={`/movie/${id}`} key={id}>
                        <a className="column is-6">
                          <Card caption={movies[id].title} imgUrl={imgUrl} />
                        </a>
                      </Link>
                    );
                  } else {
                    return null;
                  }
                })}
              </div>
            </div>
          </div>
        </main>
      )}
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const actorId = String(ctx.query.actorId);
  const data = await prisma.actor.findFirst({
    where: {
      id: actorId,
    },
    include: {
      Movie: {
        include: {
          Actor: true,
        },
      },
    },
    take: 1,
  });

  const movieImgUrls = await Promise.all(
    data.Movie.map(async (movie) => {
      const imgUrl = await getMovieImgUrl(movie.title);
      return {
        imgUrl,
        id: movie.id,
      };
    })
  );

  const actorImgurl = await getActorImgUrl(data.name);

  return {
    props: {
      data: forceSerialize({ ...data, movieImgUrls, actorImgurl }),
    },
  };
};

export default ActorDetails;
