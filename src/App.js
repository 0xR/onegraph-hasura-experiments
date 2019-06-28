import ApolloClient, { gql } from "apollo-boost";
import { ApolloProvider, Query } from "react-apollo";
import OneGraphAuth, { LocalStorage } from "onegraph-auth";

import React, { useState, useMemo, useEffect } from "react";
import "./App.css";

const APP_ID = "a3710708-ef73-43dc-8e6c-0dfb7601fb50";

function ShowData({ data }) {
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}

const listTrelloQuery = gql`
  query ListCardsPerList {
    npmFavorites {
      packageName
      npm {
        homepage
        maintainers {
          email
        }
        downloads {
          lastMonth {
            count
          }
        }
      }
    }
    trello {
      board(id: "z98QYfIa") {
        name
        lists {
          nodes {
            name
            cards {
              nodes {
                name
              }
            }
          }
        }
      }
    }
  }
`;

const listNpmFavorites = gql`
  query {
    npmFavorites {
      packageName
      npm {
        maintainers {
          name
          email
        }
        downloads {
          lastMonth {
            count
          }
        }
      }
    }
  }
`;

const graphqlQuery = listNpmFavorites;
// const graphqlQuery = listTrelloQuery;

function App() {
  const [loginState, setLoginState] = useState("initial");
  const [error, setError] = useState(null);
  const oneGraphAuth = useMemo(
    () =>
      new OneGraphAuth({
        appId: APP_ID,
        storage: new LocalStorage()
      }),
    []
  );
  const apolloClient = useMemo(
    () =>
      new ApolloClient({
        uri: "http://localhost:8080/v1/graphql",
        request: operation =>
          operation.setContext({ headers: oneGraphAuth.authHeaders() })
      }),
    [oneGraphAuth]
  );

  async function checkIsLoggedIn() {
    try {
      setLoginState("checking");
      const isLoggedIn = await oneGraphAuth.isLoggedIn("trello");
      setError(null);
      if (isLoggedIn) {
        setLoginState("loggedIn");
      } else {
        setLoginState("notLoggedIn");
      }
    } catch (e) {
      setLoginState("error");
      setError(e);
    }
  }

  useEffect(() => {
    checkIsLoggedIn();
  }, []);

  return (
    <ApolloProvider client={apolloClient}>
      <button
        onClick={async () => {
          setLoginState("checking");
          try {
            await oneGraphAuth.login("trello");
            await checkIsLoggedIn();
          } catch (e) {
            setLoginState("error");
            setError(e);
          }
        }}
      >
        Login
      </button>
      <p>{loginState}</p>
      {error && <ShowData data={error} />}
      {loginState === "loggedIn" && (
        <Query query={graphqlQuery}>
          {({ loading, error, data }) => {
            if (loading) return <div>Loading...</div>;
            if (error)
              return (
                <div>
                  Uh oh, something went wrong! <ShowData data={error} />
                </div>
              );
            return <ShowData data={data} />;
          }}
        </Query>
      )}
    </ApolloProvider>
  );
}

export default App;
