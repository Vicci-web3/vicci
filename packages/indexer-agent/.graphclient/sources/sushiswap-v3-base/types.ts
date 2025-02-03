// @ts-nocheck

import { InContextSdkMethod } from '@graphql-mesh/types';
import { MeshContext } from '@graphql-mesh/runtime';

export namespace SushiswapV3BaseTypes {
  export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  BigDecimal: { input: any; output: any; }
  BigInt: { input: any; output: any; }
  Bytes: { input: any; output: any; }
  Int8: { input: any; output: any; }
  Timestamp: { input: any; output: any; }
};

export type Aggregation_interval =
  | 'hour'
  | 'day';

export type BlockChangedFilter = {
  number_gte: Scalars['Int']['input'];
};

export type Block_height = {
  hash?: InputMaybe<Scalars['Bytes']['input']>;
  number?: InputMaybe<Scalars['Int']['input']>;
  number_gte?: InputMaybe<Scalars['Int']['input']>;
};

export type FeeAmountEnabled = {
  id: Scalars['Bytes']['output'];
  fee: Scalars['Int']['output'];
  tickSpacing: Scalars['Int']['output'];
  blockNumber: Scalars['BigInt']['output'];
  blockTimestamp: Scalars['BigInt']['output'];
  transactionHash: Scalars['Bytes']['output'];
};

export type FeeAmountEnabled_filter = {
  id?: InputMaybe<Scalars['Bytes']['input']>;
  id_not?: InputMaybe<Scalars['Bytes']['input']>;
  id_gt?: InputMaybe<Scalars['Bytes']['input']>;
  id_lt?: InputMaybe<Scalars['Bytes']['input']>;
  id_gte?: InputMaybe<Scalars['Bytes']['input']>;
  id_lte?: InputMaybe<Scalars['Bytes']['input']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_contains?: InputMaybe<Scalars['Bytes']['input']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  fee?: InputMaybe<Scalars['Int']['input']>;
  fee_not?: InputMaybe<Scalars['Int']['input']>;
  fee_gt?: InputMaybe<Scalars['Int']['input']>;
  fee_lt?: InputMaybe<Scalars['Int']['input']>;
  fee_gte?: InputMaybe<Scalars['Int']['input']>;
  fee_lte?: InputMaybe<Scalars['Int']['input']>;
  fee_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  fee_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  tickSpacing?: InputMaybe<Scalars['Int']['input']>;
  tickSpacing_not?: InputMaybe<Scalars['Int']['input']>;
  tickSpacing_gt?: InputMaybe<Scalars['Int']['input']>;
  tickSpacing_lt?: InputMaybe<Scalars['Int']['input']>;
  tickSpacing_gte?: InputMaybe<Scalars['Int']['input']>;
  tickSpacing_lte?: InputMaybe<Scalars['Int']['input']>;
  tickSpacing_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  tickSpacing_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  blockNumber?: InputMaybe<Scalars['BigInt']['input']>;
  blockNumber_not?: InputMaybe<Scalars['BigInt']['input']>;
  blockNumber_gt?: InputMaybe<Scalars['BigInt']['input']>;
  blockNumber_lt?: InputMaybe<Scalars['BigInt']['input']>;
  blockNumber_gte?: InputMaybe<Scalars['BigInt']['input']>;
  blockNumber_lte?: InputMaybe<Scalars['BigInt']['input']>;
  blockNumber_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  blockNumber_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  blockTimestamp?: InputMaybe<Scalars['BigInt']['input']>;
  blockTimestamp_not?: InputMaybe<Scalars['BigInt']['input']>;
  blockTimestamp_gt?: InputMaybe<Scalars['BigInt']['input']>;
  blockTimestamp_lt?: InputMaybe<Scalars['BigInt']['input']>;
  blockTimestamp_gte?: InputMaybe<Scalars['BigInt']['input']>;
  blockTimestamp_lte?: InputMaybe<Scalars['BigInt']['input']>;
  blockTimestamp_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  blockTimestamp_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  transactionHash?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_not?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_gt?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_lt?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_gte?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_lte?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  transactionHash_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  transactionHash_contains?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<FeeAmountEnabled_filter>>>;
  or?: InputMaybe<Array<InputMaybe<FeeAmountEnabled_filter>>>;
};

export type FeeAmountEnabled_orderBy =
  | 'id'
  | 'fee'
  | 'tickSpacing'
  | 'blockNumber'
  | 'blockTimestamp'
  | 'transactionHash';

/** Defines the order direction, either ascending or descending */
export type OrderDirection =
  | 'asc'
  | 'desc';

export type OwnerChanged = {
  id: Scalars['Bytes']['output'];
  oldOwner: Scalars['Bytes']['output'];
  newOwner: Scalars['Bytes']['output'];
  blockNumber: Scalars['BigInt']['output'];
  blockTimestamp: Scalars['BigInt']['output'];
  transactionHash: Scalars['Bytes']['output'];
};

export type OwnerChanged_filter = {
  id?: InputMaybe<Scalars['Bytes']['input']>;
  id_not?: InputMaybe<Scalars['Bytes']['input']>;
  id_gt?: InputMaybe<Scalars['Bytes']['input']>;
  id_lt?: InputMaybe<Scalars['Bytes']['input']>;
  id_gte?: InputMaybe<Scalars['Bytes']['input']>;
  id_lte?: InputMaybe<Scalars['Bytes']['input']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_contains?: InputMaybe<Scalars['Bytes']['input']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  oldOwner?: InputMaybe<Scalars['Bytes']['input']>;
  oldOwner_not?: InputMaybe<Scalars['Bytes']['input']>;
  oldOwner_gt?: InputMaybe<Scalars['Bytes']['input']>;
  oldOwner_lt?: InputMaybe<Scalars['Bytes']['input']>;
  oldOwner_gte?: InputMaybe<Scalars['Bytes']['input']>;
  oldOwner_lte?: InputMaybe<Scalars['Bytes']['input']>;
  oldOwner_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  oldOwner_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  oldOwner_contains?: InputMaybe<Scalars['Bytes']['input']>;
  oldOwner_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  newOwner?: InputMaybe<Scalars['Bytes']['input']>;
  newOwner_not?: InputMaybe<Scalars['Bytes']['input']>;
  newOwner_gt?: InputMaybe<Scalars['Bytes']['input']>;
  newOwner_lt?: InputMaybe<Scalars['Bytes']['input']>;
  newOwner_gte?: InputMaybe<Scalars['Bytes']['input']>;
  newOwner_lte?: InputMaybe<Scalars['Bytes']['input']>;
  newOwner_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  newOwner_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  newOwner_contains?: InputMaybe<Scalars['Bytes']['input']>;
  newOwner_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  blockNumber?: InputMaybe<Scalars['BigInt']['input']>;
  blockNumber_not?: InputMaybe<Scalars['BigInt']['input']>;
  blockNumber_gt?: InputMaybe<Scalars['BigInt']['input']>;
  blockNumber_lt?: InputMaybe<Scalars['BigInt']['input']>;
  blockNumber_gte?: InputMaybe<Scalars['BigInt']['input']>;
  blockNumber_lte?: InputMaybe<Scalars['BigInt']['input']>;
  blockNumber_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  blockNumber_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  blockTimestamp?: InputMaybe<Scalars['BigInt']['input']>;
  blockTimestamp_not?: InputMaybe<Scalars['BigInt']['input']>;
  blockTimestamp_gt?: InputMaybe<Scalars['BigInt']['input']>;
  blockTimestamp_lt?: InputMaybe<Scalars['BigInt']['input']>;
  blockTimestamp_gte?: InputMaybe<Scalars['BigInt']['input']>;
  blockTimestamp_lte?: InputMaybe<Scalars['BigInt']['input']>;
  blockTimestamp_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  blockTimestamp_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  transactionHash?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_not?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_gt?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_lt?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_gte?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_lte?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  transactionHash_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  transactionHash_contains?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<OwnerChanged_filter>>>;
  or?: InputMaybe<Array<InputMaybe<OwnerChanged_filter>>>;
};

export type OwnerChanged_orderBy =
  | 'id'
  | 'oldOwner'
  | 'newOwner'
  | 'blockNumber'
  | 'blockTimestamp'
  | 'transactionHash';

export type PoolCreated = {
  id: Scalars['Bytes']['output'];
  token0: Scalars['Bytes']['output'];
  token1: Scalars['Bytes']['output'];
  fee: Scalars['Int']['output'];
  tickSpacing: Scalars['Int']['output'];
  pool: Scalars['Bytes']['output'];
  blockNumber: Scalars['BigInt']['output'];
  blockTimestamp: Scalars['BigInt']['output'];
  transactionHash: Scalars['Bytes']['output'];
};

export type PoolCreated_filter = {
  id?: InputMaybe<Scalars['Bytes']['input']>;
  id_not?: InputMaybe<Scalars['Bytes']['input']>;
  id_gt?: InputMaybe<Scalars['Bytes']['input']>;
  id_lt?: InputMaybe<Scalars['Bytes']['input']>;
  id_gte?: InputMaybe<Scalars['Bytes']['input']>;
  id_lte?: InputMaybe<Scalars['Bytes']['input']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_contains?: InputMaybe<Scalars['Bytes']['input']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  token0?: InputMaybe<Scalars['Bytes']['input']>;
  token0_not?: InputMaybe<Scalars['Bytes']['input']>;
  token0_gt?: InputMaybe<Scalars['Bytes']['input']>;
  token0_lt?: InputMaybe<Scalars['Bytes']['input']>;
  token0_gte?: InputMaybe<Scalars['Bytes']['input']>;
  token0_lte?: InputMaybe<Scalars['Bytes']['input']>;
  token0_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  token0_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  token0_contains?: InputMaybe<Scalars['Bytes']['input']>;
  token0_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  token1?: InputMaybe<Scalars['Bytes']['input']>;
  token1_not?: InputMaybe<Scalars['Bytes']['input']>;
  token1_gt?: InputMaybe<Scalars['Bytes']['input']>;
  token1_lt?: InputMaybe<Scalars['Bytes']['input']>;
  token1_gte?: InputMaybe<Scalars['Bytes']['input']>;
  token1_lte?: InputMaybe<Scalars['Bytes']['input']>;
  token1_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  token1_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  token1_contains?: InputMaybe<Scalars['Bytes']['input']>;
  token1_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  fee?: InputMaybe<Scalars['Int']['input']>;
  fee_not?: InputMaybe<Scalars['Int']['input']>;
  fee_gt?: InputMaybe<Scalars['Int']['input']>;
  fee_lt?: InputMaybe<Scalars['Int']['input']>;
  fee_gte?: InputMaybe<Scalars['Int']['input']>;
  fee_lte?: InputMaybe<Scalars['Int']['input']>;
  fee_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  fee_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  tickSpacing?: InputMaybe<Scalars['Int']['input']>;
  tickSpacing_not?: InputMaybe<Scalars['Int']['input']>;
  tickSpacing_gt?: InputMaybe<Scalars['Int']['input']>;
  tickSpacing_lt?: InputMaybe<Scalars['Int']['input']>;
  tickSpacing_gte?: InputMaybe<Scalars['Int']['input']>;
  tickSpacing_lte?: InputMaybe<Scalars['Int']['input']>;
  tickSpacing_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  tickSpacing_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  pool?: InputMaybe<Scalars['Bytes']['input']>;
  pool_not?: InputMaybe<Scalars['Bytes']['input']>;
  pool_gt?: InputMaybe<Scalars['Bytes']['input']>;
  pool_lt?: InputMaybe<Scalars['Bytes']['input']>;
  pool_gte?: InputMaybe<Scalars['Bytes']['input']>;
  pool_lte?: InputMaybe<Scalars['Bytes']['input']>;
  pool_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  pool_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  pool_contains?: InputMaybe<Scalars['Bytes']['input']>;
  pool_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  blockNumber?: InputMaybe<Scalars['BigInt']['input']>;
  blockNumber_not?: InputMaybe<Scalars['BigInt']['input']>;
  blockNumber_gt?: InputMaybe<Scalars['BigInt']['input']>;
  blockNumber_lt?: InputMaybe<Scalars['BigInt']['input']>;
  blockNumber_gte?: InputMaybe<Scalars['BigInt']['input']>;
  blockNumber_lte?: InputMaybe<Scalars['BigInt']['input']>;
  blockNumber_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  blockNumber_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  blockTimestamp?: InputMaybe<Scalars['BigInt']['input']>;
  blockTimestamp_not?: InputMaybe<Scalars['BigInt']['input']>;
  blockTimestamp_gt?: InputMaybe<Scalars['BigInt']['input']>;
  blockTimestamp_lt?: InputMaybe<Scalars['BigInt']['input']>;
  blockTimestamp_gte?: InputMaybe<Scalars['BigInt']['input']>;
  blockTimestamp_lte?: InputMaybe<Scalars['BigInt']['input']>;
  blockTimestamp_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  blockTimestamp_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  transactionHash?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_not?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_gt?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_lt?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_gte?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_lte?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  transactionHash_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  transactionHash_contains?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<PoolCreated_filter>>>;
  or?: InputMaybe<Array<InputMaybe<PoolCreated_filter>>>;
};

export type PoolCreated_orderBy =
  | 'id'
  | 'token0'
  | 'token1'
  | 'fee'
  | 'tickSpacing'
  | 'pool'
  | 'blockNumber'
  | 'blockTimestamp'
  | 'transactionHash';

export type Query = {
  feeAmountEnabled?: Maybe<FeeAmountEnabled>;
  feeAmountEnableds: Array<FeeAmountEnabled>;
  ownerChanged?: Maybe<OwnerChanged>;
  ownerChangeds: Array<OwnerChanged>;
  poolCreated?: Maybe<PoolCreated>;
  poolCreateds: Array<PoolCreated>;
  /** Access to subgraph metadata */
  _meta?: Maybe<_Meta_>;
};


export type QueryfeeAmountEnabledArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryfeeAmountEnabledsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<FeeAmountEnabled_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<FeeAmountEnabled_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryownerChangedArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryownerChangedsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<OwnerChanged_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<OwnerChanged_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerypoolCreatedArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerypoolCreatedsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<PoolCreated_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<PoolCreated_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_metaArgs = {
  block?: InputMaybe<Block_height>;
};

export type Subscription = {
  feeAmountEnabled?: Maybe<FeeAmountEnabled>;
  feeAmountEnableds: Array<FeeAmountEnabled>;
  ownerChanged?: Maybe<OwnerChanged>;
  ownerChangeds: Array<OwnerChanged>;
  poolCreated?: Maybe<PoolCreated>;
  poolCreateds: Array<PoolCreated>;
  /** Access to subgraph metadata */
  _meta?: Maybe<_Meta_>;
};


export type SubscriptionfeeAmountEnabledArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionfeeAmountEnabledsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<FeeAmountEnabled_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<FeeAmountEnabled_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionownerChangedArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionownerChangedsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<OwnerChanged_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<OwnerChanged_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionpoolCreatedArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionpoolCreatedsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<PoolCreated_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<PoolCreated_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_metaArgs = {
  block?: InputMaybe<Block_height>;
};

export type _Block_ = {
  /** The hash of the block */
  hash?: Maybe<Scalars['Bytes']['output']>;
  /** The block number */
  number: Scalars['Int']['output'];
  /** Integer representation of the timestamp stored in blocks for the chain */
  timestamp?: Maybe<Scalars['Int']['output']>;
  /** The hash of the parent block */
  parentHash?: Maybe<Scalars['Bytes']['output']>;
};

/** The type for the top-level _meta field */
export type _Meta_ = {
  /**
   * Information about a specific subgraph block. The hash of the block
   * will be null if the _meta field has a block constraint that asks for
   * a block number. It will be filled if the _meta field has no block constraint
   * and therefore asks for the latest  block
   *
   */
  block: _Block_;
  /** The deployment ID */
  deployment: Scalars['String']['output'];
  /** If `true`, the subgraph encountered indexing errors at some past block */
  hasIndexingErrors: Scalars['Boolean']['output'];
};

export type _SubgraphErrorPolicy_ =
  /** Data will be returned even if the subgraph has indexing errors */
  | 'allow'
  /** If the subgraph has indexing errors, data will be omitted. The default. */
  | 'deny';

  export type QuerySdk = {
      /** null **/
  feeAmountEnabled: InContextSdkMethod<Query['feeAmountEnabled'], QueryfeeAmountEnabledArgs, MeshContext>,
  /** null **/
  feeAmountEnableds: InContextSdkMethod<Query['feeAmountEnableds'], QueryfeeAmountEnabledsArgs, MeshContext>,
  /** null **/
  ownerChanged: InContextSdkMethod<Query['ownerChanged'], QueryownerChangedArgs, MeshContext>,
  /** null **/
  ownerChangeds: InContextSdkMethod<Query['ownerChangeds'], QueryownerChangedsArgs, MeshContext>,
  /** null **/
  poolCreated: InContextSdkMethod<Query['poolCreated'], QuerypoolCreatedArgs, MeshContext>,
  /** null **/
  poolCreateds: InContextSdkMethod<Query['poolCreateds'], QuerypoolCreatedsArgs, MeshContext>,
  /** Access to subgraph metadata **/
  _meta: InContextSdkMethod<Query['_meta'], Query_metaArgs, MeshContext>
  };

  export type MutationSdk = {
    
  };

  export type SubscriptionSdk = {
      /** null **/
  feeAmountEnabled: InContextSdkMethod<Subscription['feeAmountEnabled'], SubscriptionfeeAmountEnabledArgs, MeshContext>,
  /** null **/
  feeAmountEnableds: InContextSdkMethod<Subscription['feeAmountEnableds'], SubscriptionfeeAmountEnabledsArgs, MeshContext>,
  /** null **/
  ownerChanged: InContextSdkMethod<Subscription['ownerChanged'], SubscriptionownerChangedArgs, MeshContext>,
  /** null **/
  ownerChangeds: InContextSdkMethod<Subscription['ownerChangeds'], SubscriptionownerChangedsArgs, MeshContext>,
  /** null **/
  poolCreated: InContextSdkMethod<Subscription['poolCreated'], SubscriptionpoolCreatedArgs, MeshContext>,
  /** null **/
  poolCreateds: InContextSdkMethod<Subscription['poolCreateds'], SubscriptionpoolCreatedsArgs, MeshContext>,
  /** Access to subgraph metadata **/
  _meta: InContextSdkMethod<Subscription['_meta'], Subscription_metaArgs, MeshContext>
  };

  export type Context = {
      ["sushiswap-v3-base"]: { Query: QuerySdk, Mutation: MutationSdk, Subscription: SubscriptionSdk },
      
    };
}
