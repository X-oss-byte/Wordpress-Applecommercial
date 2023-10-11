/**
 * WordPress dependencies
 */
import {
	privateApis as componentsPrivateApis,
	__experimentalHeading as Heading,
	__experimentalVStack as VStack,
	Button,
	Icon,
} from '@wordpress/components';
import { chevronDown, check } from '@wordpress/icons';
import { __ } from '@wordpress/i18n';
import { useEntityRecords } from '@wordpress/core-data';
import { decodeEntities } from '@wordpress/html-entities';
import { useState, useMemo } from '@wordpress/element';
import { dateI18n, getDate, getSettings } from '@wordpress/date';

/**
 * Internal dependencies
 */
import Page from '../page';
import Link from '../routes/link';
import { DataViews } from '../dataviews';
import useTrashPostAction from '../actions/trash-post';
import Media from '../media';
import { unlock } from '../../lock-unlock';

const { DropdownMenuV2, DropdownMenuItemV2 } = unlock( componentsPrivateApis );

const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

export default function PagePages() {
	const [ view, setView ] = useState( {
		type: 'list',
		search: '',
		filters: {},
		page: 0,
		perPage: 5,
		sort: {
			field: 'date',
			direction: 'desc',
		},
		// All fields are visible by default, so it's
		// better to keep track of the hidden ones.
		hiddenFields: [ 'date', 'featured-image' ],
	} );
	// Request post statuses to get the proper labels.
	const { records: statuses } = useEntityRecords( 'root', 'status' );
	const postStatuses =
		statuses === null
			? EMPTY_OBJECT
			: statuses.reduce( ( acc, status ) => {
					acc[ status.slug ] = status.name;
					return acc;
			  }, EMPTY_OBJECT );

	const queryArgs = useMemo(
		() => ( {
			per_page: view.perPage,
			page: view.page + 1, // tanstack starts from zero.
			_embed: 'author',
			order: view.sort?.direction,
			orderby: view.sort?.field,
			search: view.search,
			author: view.filters?.author,
			status: [ 'publish', 'draft' ],
		} ),
		[ view ]
	);
	const {
		records: pages,
		isResolving: isLoadingPages,
		totalItems,
		totalPages,
	} = useEntityRecords( 'postType', 'page', queryArgs );

	const { records: authors } = useEntityRecords( 'root', 'user', {
		who: 'authors',
	} );

	const paginationInfo = useMemo(
		() => ( {
			totalItems,
			totalPages,
		} ),
		[ totalItems, totalPages ]
	);

	const fields = useMemo(
		() => [
			{
				id: 'featured-image',
				header: __( 'Featured Image' ),
				accessorFn: ( page ) => page.featured_media,
				cell: ( props ) =>
					!! props.row.original.featured_media ? (
						<Media
							className="edit-site-page-pages__featured-image"
							id={ props.row.original.featured_media }
							size="thumbnail"
						/>
					) : null,
				enableSorting: false,
			},
			{
				header: __( 'Title' ),
				id: 'title',
				accessorFn: ( page ) => page.title?.rendered || page.slug,
				cell: ( props ) => {
					const page = props.row.original;
					return (
						<VStack spacing={ 1 }>
							<Heading as="h3" level={ 5 }>
								<Link
									params={ {
										postId: page.id,
										postType: page.type,
										canvas: 'edit',
									} }
								>
									{ decodeEntities( props.getValue() ) ||
										__( '(no title)' ) }
								</Link>
							</Heading>
						</VStack>
					);
				},
				maxWidth: 400,
				sortingFn: 'alphanumeric',
				enableHiding: false,
			},
			{
				header: __( 'Author' ),
				id: 'author',
				accessorFn: ( page ) => page._embedded?.author[ 0 ]?.name,
				cell: ( props ) => {
					const author = props.row.original._embedded?.author[ 0 ];
					return (
						<a href={ `user-edit.php?user_id=${ author.id }` }>
							{ author.name }
						</a>
					);
				},
				renderFilter: () => {
					if ( ! authors ) {
						return null;
					}

					return (
						<DropdownMenuV2
							key={ 'filter-author' }
							trigger={
								<Button variant="tertiary">
									{ __( 'Author' ) }
									<Icon icon={ chevronDown } />
								</Button>
							}
						>
							{ authors.map( ( author ) => {
								return (
									<DropdownMenuItemV2
										key={ author.id }
										prefix={
											view.filters?.author !==
												undefined && (
												<Icon icon={ check } />
											)
										}
										role="menuitemcheckbox"
										onSelect={ ( event ) => {
											event.preventDefault();
											setView( ( currentView ) => {
												return {
													...currentView,
													filters: {
														...currentView.filters,
														author: author.id,
													},
												};
											} );
										} }
									>
										{ author.name }
									</DropdownMenuItemV2>
								);
							} ) }
						</DropdownMenuV2>
					);
				},
			},
			{
				header: __( 'Status' ),
				id: 'status',
				accessorFn: ( page ) =>
					postStatuses[ page.status ] ?? page.status,
				enableSorting: false,
				enableColumnFilter: false,
			},
			{
				header: 'Date',
				id: 'date',
				cell: ( props ) => {
					const formattedDate = dateI18n(
						getSettings().formats.datetimeAbbreviated,
						getDate( props.row.original.date )
					);
					return <time>{ formattedDate }</time>;
				},
				enableSorting: false,
			},
		],
		[ postStatuses, authors ]
	);

	const trashPostAction = useTrashPostAction();
	const actions = useMemo( () => [ trashPostAction ], [ trashPostAction ] );

	// TODO: we need to handle properly `data={ data || EMPTY_ARRAY }` for when `isLoading`.
	return (
		<Page title={ __( 'Pages' ) }>
			<DataViews
				paginationInfo={ paginationInfo }
				fields={ fields }
				actions={ actions }
				data={ pages || EMPTY_ARRAY }
				isLoading={ isLoadingPages }
				view={ view }
				onChangeView={ setView }
			/>
		</Page>
	);
}
