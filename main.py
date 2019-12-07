from flask import Flask, render_template
from flask_sqlalchemy import SQLAlchemy
from PIL import Image
import os

app = Flask(__name__, static_folder = 'dist/static')
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///personal_website.db'
db = SQLAlchemy(app)


class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cell_id = db.Column(db.Integer)
    name = db.Column(db.String(80), nullable=False)
    tags = db.Column(db.String(80), nullable=False)
    url = db.Column(db.String(120), nullable=False)
    description_line_1 = db.Column(db.String(1000), nullable=False)
    description_line_2 = db.Column(db.String(1000), nullable=False)
    description_line_3 = db.Column(db.String(1000), nullable=False)
    description_line_4 = db.Column(db.String(1000), nullable=False)
    order = db.Column(db.Integer)
    base64_image = db.Column(db.String(100000), nullable=True)
    image_format = db.Column(db.String(80), nullable=True)
    disabled = db.Column(db.Boolean)

    def __repr__(self):
        return '<Project %r>' % self.name


@app.route('/')
def index():
    write_page_html()
    return get_page_html()


@app.after_request
def add_header(response):
    """
    Add headers to both force latest IE rendering engine or Chrome Frame,
    and also to cache the rendered page for 10 minutes.
    """
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    response.headers['Cache-Control'] = 'public, max-age=0'

    return response


def create_base64_images():
    import base64

    projects = Project.query.filter().order_by(Project.order.desc())

    for project in projects:
        if project.base64_image is None or True:
            infile = os.path.join('src', 'images', f'cell-{project.cell_id}.png')
            outfile = os.path.join('src', 'images', 'base64_image', f'cell-{project.cell_id}.png')
            size = 4, 3
            im = Image.open(infile)
            im = im.resize(size, Image.ANTIALIAS)
            im.save(outfile, "png")

            with open(outfile, 'rb') as f:
                content = f.read()
                bytes = base64.encodebytes(content).decode("utf8")
                print(bytes)
                project.base64_image = f'data:image/png;base64, {bytes}'

    db.session.commit()


def get_page_html():
    projects = Project.query.filter(Project.disabled==False).order_by(Project.order.desc())
    print(projects)
    return render_template('index.html', projects=projects)


def write_page_html():
    html = get_page_html()

    with open(os.path.join('dist', 'index.html'), "w") as f:
        f.write(html)


if __name__ == '__main__':
    create_base64_images()

    app.debug = True
    app.run(host="0.0.0.0", debug=True)
