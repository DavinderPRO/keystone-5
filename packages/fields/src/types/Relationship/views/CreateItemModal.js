/** @jsx jsx */
import { jsx } from '@emotion/core';
import { Component, Fragment, useCallback, useMemo, Suspense } from 'react';
import { Mutation } from 'react-apollo';

import { Button } from '@arch-ui/button';
import Drawer from '@arch-ui/drawer';
import { arrayToObject, captureSuspensePromises } from '@keystone-alpha/utils';
import { gridSize } from '@arch-ui/theme';
import { AutocompleteCaptor } from '@arch-ui/input';
import { LoadingIndicator } from '@arch-ui/loading';

const PageLoading = () => (
  <div
    css={{
      height: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    }}
  >
    <LoadingIndicator size={12} />
  </div>
);

let Render = ({ children }) => children();

class CreateItemModal extends Component {
  constructor(props) {
    super(props);
    const { list } = props;
    const item = list.getInitialItemData();
    this.state = { item };
  }
  onCreate = event => {
    // prevent form submission
    event.preventDefault();
    // we have to stop propagation so that if this modal is inside another form
    // it won't submit the form above it
    // this will most likely happen when a CreateItemModal is nested inside
    // another CreateItemModal when creating an item in a relationship field
    // if you're thinking, why is this necessary, the modal is in a portal?
    // it's important to remember that react events
    // propagate through portals as if they aren't there
    event.stopPropagation();

    const {
      list: { fields },
      createItem,
      isLoading,
    } = this.props;
    if (isLoading) return;
    const { item } = this.state;

    createItem({
      variables: {
        data: arrayToObject(fields, 'path', field => field.serialize(item)),
      },
    }).then(data => {
      this.props.onCreate(data);
      this.setState({ item: this.props.list.getInitialItemData() });
    });
  };
  onClose = () => {
    const { isLoading } = this.props;
    if (isLoading) return;
    this.props.onClose();
  };
  onKeyDown = event => {
    if (event.defaultPrevented) return;
    switch (event.key) {
      case 'Escape':
        return this.onClose();
    }
  };
  formComponent = props => <form autoComplete="off" onSubmit={this.onCreate} {...props} />;
  render() {
    const { isLoading, isOpen, list } = this.props;
    const { item } = this.state;
    return (
      <Drawer
        closeOnBlanketClick
        component={this.formComponent}
        isOpen={isOpen}
        onClose={this.onClose}
        heading={`Create ${list.singular}`}
        onKeyDown={this.onKeyDown}
        slideInFrom="right"
        footer={
          <Fragment>
            <Button appearance="primary" type="submit">
              {isLoading ? 'Loading...' : 'Create'}
            </Button>
            <Button appearance="warning" variant="subtle" onClick={this.onClose}>
              Cancel
            </Button>
          </Fragment>
        }
      >
        <div
          css={{
            marginBottom: gridSize,
            marginTop: gridSize,
          }}
        >
          <Suspense fallback={<PageLoading />}>
            <AutocompleteCaptor />
            <Render>
              {() => {
                captureSuspensePromises(list.fields.map(field => () => field.initFieldView()));
                return list.fields.map((field, i) => {
                  return (
                    <Render key={field.path}>
                      {() => {
                        let [Field] = field.adminMeta.readViews([field.views.Field]);
                        let onChange = useCallback(value => {
                          this.setState(({ item }) => ({
                            item: {
                              ...item,
                              [field.path]: value,
                            },
                          }));
                        }, []);
                        return useMemo(
                          () => (
                            <Field
                              autoFocus={!i}
                              value={item[field.path]}
                              field={field}
                              /* TODO: Permission query results */
                              // error={}
                              onChange={onChange}
                              renderContext="dialog"
                            />
                          ),
                          [i, item[field.path], field, onChange]
                        );
                      }}
                    </Render>
                  );
                });
              }}
            </Render>
          </Suspense>
        </div>
      </Drawer>
    );
  }
}

export default class CreateItemModalWithMutation extends Component {
  render() {
    const { list } = this.props;
    return (
      <Mutation mutation={list.createMutation}>
        {(createItem, { loading }) => (
          <CreateItemModal createItem={createItem} isLoading={loading} {...this.props} />
        )}
      </Mutation>
    );
  }
}
